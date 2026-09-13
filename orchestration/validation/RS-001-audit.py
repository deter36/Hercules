"""Usage: python RS-001-audit.py <checkout> <diagnostic-json> <output-json>.
Read-only authority-pin, package-byte, RNG, and historical-checkpoint audit.
No gate decision; discrepancies are evidence, not instructions to repair canon.
"""
import collections, hashlib, json, pathlib, struct, subprocess, sys
repo, diagnostic, output = map(pathlib.Path, sys.argv[1:])
def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo)
def read(rel):
    return json.loads((repo / rel).read_text(encoding='utf-8-sig'))
manifest=read('orchestration/project_state.json')
diag=json.loads(diagnostic.read_text(encoding='utf-8'))
result={'tested_commit':git('rev-parse','HEAD').decode().strip(),
        'manifest_revision':manifest['manifest_revision'], 'pins':[], 'checksums':[]}
for a in manifest['canonical_artifacts']:
    actual=git('rev-parse','HEAD:'+a['path']).decode().strip()
    entry=dict(a, actual_git_object=actual, object_matches=actual==a['git_object'])
    if a['kind']=='blob':
        sha=hashlib.sha256(git('cat-file','blob',actual)).hexdigest()
        entry.update(actual_sha256_git_bytes=sha, sha256_matches=sha==a['sha256_git_bytes'],
                     checkout_matches=git('hash-object','--',a['path']).decode().strip()==actual)
    else:
        entry['checkout_matches']=not bool(git('status','--porcelain','--untracked-files=all','--',a['path']).strip())
    result['pins'].append(entry)
for fn,expected in read('src/data/raw/SHA256SUMS.json').items():
    blob=git('cat-file','blob','HEAD:src/data/raw/'+fn)
    result['checksums'].append({'path':'src/data/raw/'+fn,'expected':expected,
                               'actual':hashlib.sha256(blob).hexdigest(),
                               'matches':hashlib.sha256(blob).hexdigest()==expected})
blob=git('cat-file','blob','HEAD:src/data/raw/GAME_DATA_v4.json')
result['line_ending_controls']={'git_blob_lf_count':blob.count(b'\n'),'git_blob_crlf_count':blob.count(b'\r\n'),
 'crlf_bytes_sha256':hashlib.sha256(blob.replace(b'\n',b'\r\n')).hexdigest(),
 'checkout_bytes_sha256':hashlib.sha256((repo/'src/data/raw/GAME_DATA_v4.json').read_bytes()).hexdigest()}
record=read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json')
script=read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json')
data=read('src/data/raw/GAME_DATA_v4.json')
ledger=record['rng_event_ledger']; errors=[]; computed=[]
for event in ledger:
    i=event['event_index']
    if event['status']=='orphaned_execution_error':
        if not 18<=i<=25: errors.append({'index':i,'reason':'unexpected orphan'})
        continue
    seed=record['seed'].encode(); purpose=event['purpose'].encode()
    interpreted=event['interpreted_result']; bound=6 if 'face' in interpreted else interpreted['bound']
    limit=2**64-(2**64%bound)
    for attempt in range(event['attempt']+1):
        preimage=b'HERC-RNG-V2\x00'+struct.pack('>I',len(seed))+seed+struct.pack('>Q',i)+struct.pack('>I',len(purpose))+purpose+struct.pack('>I',attempt)
        raw=int.from_bytes(hashlib.sha256(preimage).digest()[:8],'big')
        if attempt<event['attempt'] and raw<limit: errors.append({'index':i,'reason':'unnecessary rejection'})
    value=raw%bound+(1 if 'face' in interpreted else 0)
    expected=interpreted.get('face',interpreted.get('j'))
    if raw>=limit or str(raw)!=event['raw64'] or value!=expected: errors.append({'index':i,'reason':'random event mismatch'})
    computed.append({'event_index':i,'value':value})
indices=[e['event_index'] for e in ledger]
orphans=[e['event_index'] for e in ledger if e['status']=='orphaned_execution_error']
result['rng']={'method':'Independent Python hashlib SHA-256 and big-endian length-prefixed encoding; check rejection attempts, bounds, ledger indices and interpreted results',
 'contiguous_0_through_173':indices==list(range(174)), 'orphaned_indices':orphans,
 'expected_orphan_range_matches':orphans==list(range(18,26)), 'computed_committed_events':len(computed),
 'errors':errors, 'event_153':next(x for x in computed if x['event_index']==153)}
names={m['id']:m['name'] for m in data['moods']}
normal_names=[m['name'] for m in data['moods'] if m['class']=='normal']
orders=[normal_names,record['initial_mood_input_order_approved_for_run'],script['preconditions']['initial_mood_input_order'],script['inputs'][0]['order']]
result['initial_mood_order']={'orders_match':all(x==orders[0] for x in orders), 'names':normal_names}
result['script']={'input_count':len(script['inputs']), 'sequential_1_through_112':[i['seq'] for i in script['inputs']]==list(range(1,113)),
 'action_counts':dict(collections.Counter(i['action'] for i in script['inputs'])),
 'migration_derived_count':sum(i.get('migration_derived',False) for i in script['inputs']),
 'unsupported_by_adapter':[]}
map_reward=lambda old: 'component.bow' if old=='COMPONENT_BOW_OF_HERCULES' else next(r['id'] for l in data['labors'] for r in l.get('rewards',[]) if r['name']==script['id_map']['rewards'][old])
result['checkpoints']=[]
for old,new in zip(record['checkpoints'],diag['golden']['checkpoints']):
    checks={'spirit':old['spirit']==new['player']['spirit'],
      'divinity':int(old['divinity'].split('/')[0])==new['player']['divinity'],
      'next_event':old['next_event']==int(new['rng']['nextEvent']),
      'mood_order':old['mood_deck_top_to_bottom']==[names[i] for i in new['mood']['deck']],
      'completed_labors':old['completed_labors']==[int(i[-2:]) for i in new['game']['completedLaborIds']],
      'rewards':[map_reward(i) for i in old['owned_rewards']]==new['player']['ownedRewardIds'],
      'removed_components':[map_reward(i) for i in old.get('removed_components',[])]==new['player']['removedRewardOrComponentIds'],
      'persistent_dice_count':len(old['hercules_dice'])==new['player']['persistentHerculesDice'],
      'broken_dice':[i for i,status in old['hercules_dice'].items() if status=='broken_until_next_labor_setup']==[i for i,die in new['herculesDice'].items() if die['broken']]}
    result['checkpoints'].append({'completed_labor':old['completed_labor'],'checks':checks,'all_listed_checks_match':all(checks.values()),
       'boundary':'after reward and end-Labor shuffle, before next Labor setup/Mood resolution; not every die flag is certified by the coarse historical labels'})
result['terminal_summary']={'actual_phase':diag['golden']['state']['game']['phase'],'actual_spirit':diag['golden']['state']['player']['spirit'],
 'actual_divinity':diag['golden']['state']['player']['divinity'],'actual_next_event':diag['golden']['state']['rng']['nextEvent'],
 'expected_failed_die_status':'active_failure_terminal','actual_failed_die_status':diag['golden']['state']['currentLabor']['laborDice']['labor.L06.C17']['status']}
result['generated']={k:diag[k] for k in ['generated_source_hash','generated_content_hash','generated_matches_raw_object']}
output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pins_match':all(p['object_matches'] and p['checkout_matches'] and p.get('sha256_matches',True) for p in result['pins']),
 'checksum_mismatches':[x['path'] for x in result['checksums'] if not x['matches']],
 'rng':result['rng'],'checkpoint_matches':[x['all_listed_checks_match'] for x in result['checkpoints']],
 'terminal_summary':result['terminal_summary']},indent=2))
