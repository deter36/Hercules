// Generated from src/data/raw/GAME_DATA_v4.json. Do not edit.
export const GAME_DATA_SOURCE_HASH = "356bb6b4554c8872cc853986362c572e8601f8b0c0ffbfc6c69d9505f4102303" as const;
export const GAME_DATA_CONTENT_HASH = "d731fd0dfdf7ff9dfb27fe25f5f61c6e4274a73bab7854ed0085fc76e804052e" as const;
export const GAME_DATA = {
  "schema_version": "hercules_game_data_v4",
  "game_id": "hercules_12_labors",
  "source_manifest": {
    "rules_authority": "Hercules_Rules_104x155.pdf",
    "gameplay_reference": "Hercules_Verified_Gameplay_Reference_v12.md",
    "execution_spec": "hercules_engine_execution_spec_v0_13.md",
    "rng_spec": "Hercules_RNG_Spec_v3.md"
  },
  "id_policy": {
    "notes": [
      "IDs are implementation-facing stable identifiers.",
      "Reward variants use A/B/C/D in physical left-to-right order.",
      "Names are display labels only and are never primary keys."
    ]
  },
  "difficulty": {
    "human": {
      "starting_hercules_dice": 5,
      "remove_moods": []
    },
    "hero": {
      "starting_hercules_dice": 4,
      "remove_moods": []
    },
    "god": {
      "starting_hercules_dice": 3,
      "remove_moods": [
        "mood.battered"
      ]
    }
  },
  "components": {
    "hercules_dice": [
      {
        "id": "H1",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H2",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H3",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H4",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H5",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H6",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H7",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H8",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H9",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H10",
        "kind": "physical_die",
        "color": "blue_teal"
      },
      {
        "id": "H11",
        "kind": "physical_die",
        "color": "blue_teal"
      }
    ],
    "labor_dice": [
      {
        "id": "LD1",
        "kind": "physical_die",
        "color": "gold"
      },
      {
        "id": "LD2",
        "kind": "physical_die",
        "color": "gold"
      },
      {
        "id": "LD3",
        "kind": "physical_die",
        "color": "gold"
      },
      {
        "id": "LD4",
        "kind": "physical_die",
        "color": "gold"
      }
    ],
    "bow": {
      "id": "component.bow",
      "name": "Bow of Hercules",
      "blue_ability": {
        "id": "ability.bow.blue",
        "operation": "modify_pip",
        "delta": [
          -1,
          1
        ],
        "wrap": true,
        "spirit_cost": 1,
        "uses_per_roll": 1
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9 / official component"
    }
  },
  "tracks": {
    "spirit": {
      "id": "track.spirit",
      "start": "X",
      "ordered": [
        "X",
        16,
        15,
        14,
        13,
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1,
        "SKULL"
      ]
    },
    "divinity": {
      "id": "track.divinity",
      "start": "X",
      "top": "TOP",
      "runtime_ordinal_max": 10
    }
  },
  "moods": [
    {
      "id": "mood.melancholic",
      "name": "Melancholic",
      "class": "normal",
      "effect": {
        "type": "initial_roll_delta",
        "value": -1,
        "min": 1
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.resolute",
      "name": "Resolute",
      "class": "normal",
      "effect": {
        "type": "temporary_dice_delta",
        "value": 1,
        "physical_id_mapping": "lowest_unused_ids_first",
        "player_selects_physical_die": false
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.battered",
      "name": "Battered",
      "class": "normal",
      "effect": {
        "type": "temporary_dice_delta",
        "value": -1,
        "physical_id_mapping": "highest_available_ids_first",
        "player_selects_physical_die": false
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.ferocious",
      "name": "Ferocious",
      "class": "normal",
      "effect": {
        "type": "grant_blue_any",
        "value": 1
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.enraged",
      "name": "Enraged",
      "class": "normal",
      "effect": {
        "type": "initial_roll_delta",
        "value": 1,
        "max": 6
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.haunted_a",
      "name": "Haunted A",
      "class": "normal",
      "effect": {
        "type": "spirit_delta",
        "value": -2
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.haunted_b",
      "name": "Haunted B",
      "class": "normal",
      "effect": {
        "type": "spirit_delta",
        "value": -1
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.haunted_c",
      "name": "Haunted C",
      "class": "normal",
      "effect": {
        "type": "spirit_delta",
        "value": -3
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.haunted_d",
      "name": "Haunted D",
      "class": "normal",
      "effect": {
        "type": "spirit_delta",
        "value": -2
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.weight_of_atlas",
      "name": "Weight of Atlas",
      "class": "special",
      "effect": {
        "type": "temporary_dice_delta",
        "value": -2,
        "physical_id_mapping": "highest_available_ids_first",
        "player_selects_physical_die": false
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.ghost_abderus",
      "name": "Ghost of Abderus",
      "class": "special",
      "effect": {
        "type": "player_choice",
        "options": [
          {
            "id": "lose_die",
            "temporary_dice_delta": -1
          },
          {
            "id": "lose_spirit",
            "spirit_delta": -5
          }
        ],
        "die_loss_option_physical_id_mapping": "highest_available_ids_first",
        "player_selects_physical_die_after_choosing_option": false
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.ghost_hippolyta",
      "name": "Ghost of Hippolyta",
      "class": "special",
      "effect": {
        "type": "set_aside_roll_face",
        "face": 1,
        "applies_to_rerolls": true
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "mood.ghost_pholus",
      "name": "Ghost of Pholus",
      "class": "special",
      "effect": {
        "type": "disable_owned_reward_choice",
        "duration": "labor"
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    }
  ],
  "labors": [
    {
      "id": "labor.L01",
      "number": 1,
      "name": "Nemean Lion",
      "labor_dice": [
        {
          "id": "labor.L01.d1",
          "start_health": 6,
          "track_id": "track.L01"
        }
      ],
      "attack": {
        "scope": "target",
        "requirement": {
          "type": "die_in",
          "values": [
            5,
            6
          ]
        },
        "damage": 1
      },
      "tracks": {
        "track.L01": {
          "type": "linear",
          "nodes": [
            {
              "id": "L01.start",
              "effect": null
            },
            {
              "id": "L01.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L01.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L01.n3",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L01.n4",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L01.n5",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L01",
          "name": "Impenetrable Hide",
          "bonus": [
            {
              "spirit_delta": 2
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L01.blue",
              "type": "map_value",
              "mapping": {
                "3": 6,
                "6": 3
              },
              "uses_per_roll": 1
            }
          ],
          "gold": [
            {
              "id": "ability.reward.L01.gold",
              "requirement": {
                "type": "any_die"
              },
              "effect": {
                "block_spirit": 1
              },
              "uses_per_roll": 1
            }
          ],
          "restart_cost": 0,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L02",
      "number": 2,
      "name": "Lernean Hydra",
      "labor_dice": [
        {
          "id": "labor.L02.d1",
          "start_health": 6,
          "track_id": "track.L02"
        }
      ],
      "attack": {
        "scope": "target",
        "requirement": {
          "type": "exact_die",
          "value": 6
        },
        "damage": 1
      },
      "tracks": {
        "track.L02": {
          "type": "linear",
          "nodes": [
            {
              "id": "L02.start",
              "effect": null
            },
            {
              "id": "L02.n1",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L02.n2",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L02.n3",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L02.n4",
              "effect": {
                "heal": 2
              }
            },
            {
              "id": "L02.n5",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L02.n6",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L02.n7",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L02.n8",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L02",
          "name": "Venomous Blood",
          "bonus": [
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L02.blueA",
              "type": "reroll_one",
              "uses_per_roll": 1
            },
            {
              "id": "ability.reward.L02.blueB",
              "type": "reroll_one",
              "uses_per_roll": 1
            }
          ],
          "gold": [],
          "restart_cost": 0,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L03",
      "number": 3,
      "name": "Ceryneian Hind",
      "labor_dice": [
        {
          "id": "labor.L03.d1",
          "start_health": 6,
          "track_id": "track.L03"
        }
      ],
      "attack": {
        "scope": "target",
        "requirement": {
          "type": "matching_pair"
        },
        "damage": 1
      },
      "tracks": {
        "track.L03": {
          "type": "circular",
          "start": "L03.start",
          "nodes": [
            {
              "id": "L03.start",
              "next": [
                "L03.n1"
              ]
            },
            {
              "id": "L03.n1",
              "effect": {
                "heal": 1
              },
              "next": [
                "L03.n2"
              ]
            },
            {
              "id": "L03.n2",
              "effect": {
                "break_hercules_die": 1
              },
              "next": [
                "L03.n3"
              ]
            },
            {
              "id": "L03.n3",
              "effect": {
                "heal": 1
              },
              "next": [
                "L03.n4"
              ]
            },
            {
              "id": "L03.n4",
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "L03.n1"
              ]
            }
          ]
        }
      },
      "failure_rule": {
        "type": "usable_hercules_dice_below_threshold",
        "threshold": 2,
        "condition": "hind_undefeated",
        "timing": "immediate_after_any_state_change_that_reduces_usable_dice",
        "status": "provisional_owner_approved",
        "reason": "Hind attack requires any 2 matching dice; no pre-Hind Reward can make one usable physical die satisfy the pair requirement."
      },
      "rewards": [
        {
          "id": "reward.L03",
          "name": "Blessing of Artemis",
          "bonus": [
            {
              "spirit_delta": 3
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L03.gold",
              "requirement": {
                "type": "matching_exact_pair",
                "value": 4
              },
              "effect": {
                "divinity_delta": 1
              },
              "uses_per_roll": 1
            }
          ],
          "restart_cost": 0,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified_except_provisional_failure_rule",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L04",
      "number": 4,
      "name": "Erymanthian Boar",
      "labor_dice": [
        {
          "id": "labor.L04.left",
          "start_health": 3,
          "track_id": "track.L04.left",
          "attack_id": "attack.L04.left"
        },
        {
          "id": "labor.L04.right",
          "start_health": 3,
          "track_id": "track.L04.right",
          "attack_id": "attack.L04.right"
        }
      ],
      "attacks": {
        "attack.L04.left": {
          "type": "sum_equals_third",
          "dice_count": 3
        },
        "attack.L04.right": {
          "type": "exact_sum",
          "sum": 12
        }
      },
      "tracks": {
        "track.L04.left": {
          "type": "linear",
          "nodes": [
            {
              "id": "L04L.start",
              "effect": null
            },
            {
              "id": "L04L.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L04L.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L04L.n3",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L04L.n4",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L04L.n5",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L04L.n6",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L04.right": {
          "type": "linear",
          "nodes": [
            {
              "id": "L04R.start",
              "effect": null
            },
            {
              "id": "L04R.n1",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L04R.n2",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L04R.n3",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L04R.n4",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L04R.n5",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L04R.n6",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L04.A",
          "name": "Regret A",
          "bonus": [
            {
              "spirit_delta": 2
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L04.A.gold",
              "requirement": {
                "type": "matching_pair"
              },
              "effect": {
                "spirit_delta": 2
              },
              "uses_per_roll": 1
            }
          ],
          "restart_cost": -1,
          "side_effects": [
            {
              "add_mood": "mood.ghost_pholus"
            },
            {
              "remove_mood": "mood.melancholic"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L04.B",
          "name": "Regret B",
          "bonus": [
            {
              "spirit_delta": 2
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L04.B.blue",
              "type": "effective_double_value",
              "spirit_cost": 2,
              "uses_per_roll": 1
            }
          ],
          "gold": [],
          "restart_cost": -1,
          "side_effects": [
            {
              "add_mood": "mood.ghost_pholus"
            },
            {
              "remove_mood": "mood.melancholic"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L05",
      "number": 5,
      "name": "Augean Stables",
      "labor_dice": [
        {
          "id": "labor.L05.A",
          "start_health": 5,
          "track_id": "track.L05.A"
        },
        {
          "id": "labor.L05.B",
          "start_health": 5,
          "track_id": "track.L05.B"
        }
      ],
      "attack": {
        "scope": "target",
        "requirement": {
          "type": "exact_die",
          "value": 1
        },
        "damage": 1
      },
      "tracks": {
        "track.L05.A": {
          "type": "linear",
          "nodes": [
            {
              "id": "L05A.start",
              "effect": null
            },
            {
              "id": "L05A.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L05A.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L05A.n3",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L05A.n4",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L05A.n5",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L05A.n6",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L05A.n7",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L05.B": {
          "type": "linear",
          "nodes": [
            {
              "id": "L05B.start",
              "effect": null
            },
            {
              "id": "L05B.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L05B.n2",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L05B.n3",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L05B.n4",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L05B.n5",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L05B.n6",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L05B.n7",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L05.A",
          "name": "100 Immortal Cows A",
          "bonus": [
            {
              "spirit_delta": 3
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L05.A.blue",
              "type": "sacrifice_source_set_other_any",
              "source_lost_for_roll": true,
              "target_may_be_blue_used": true,
              "uses_per_roll": 1
            }
          ],
          "gold": [],
          "restart_cost": -1,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L05.B",
          "name": "100 Immortal Cows B",
          "bonus": [
            {
              "spirit_delta": 3
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L05.B.blue",
              "type": "place_source_reroll_any",
              "source_sets_blue_used_only": true,
              "uses_per_roll": 1
            }
          ],
          "gold": [],
          "restart_cost": -3,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L06",
      "number": 6,
      "name": "Stymphalian Birds",
      "labor_dice": [
        {
          "id": "labor.L06.C14",
          "start_health": 3,
          "track_id": "track.L06.C14",
          "attack_id": "attack.L06.C14"
        },
        {
          "id": "labor.L06.C15",
          "start_health": 4,
          "track_id": "track.L06.C15",
          "attack_id": "attack.L06.C15"
        },
        {
          "id": "labor.L06.C16",
          "start_health": 4,
          "track_id": "track.L06.C16",
          "attack_id": "attack.L06.C16"
        },
        {
          "id": "labor.L06.C17",
          "start_health": 3,
          "track_id": "track.L06.C17",
          "attack_id": "attack.L06.C17"
        }
      ],
      "attacks": {
        "attack.L06.C14": {
          "type": "die_in",
          "values": [
            3,
            6
          ]
        },
        "attack.L06.C15": {
          "type": "exact_die",
          "value": 6
        },
        "attack.L06.C16": {
          "type": "exact_die",
          "value": 3
        },
        "attack.L06.C17": {
          "type": "die_in",
          "values": [
            3,
            6
          ]
        }
      },
      "tracks": {
        "track.L06.C14": {
          "type": "linear",
          "nodes": [
            {
              "id": "L06C14.start",
              "effect": null
            },
            {
              "id": "L06C14.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L06C14.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L06C14.n3",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L06.C15": {
          "type": "linear",
          "nodes": [
            {
              "id": "L06C15.start",
              "effect": null
            },
            {
              "id": "L06C15.n1",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L06C15.n2",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L06C15.n3",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L06C15.n4",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L06.C16": {
          "type": "linear",
          "nodes": [
            {
              "id": "L06C16.start",
              "effect": null
            },
            {
              "id": "L06C16.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L06C16.n2",
              "effect": {
                "advance_all_other_active_labor_dice": 1
              }
            },
            {
              "id": "L06C16.n3",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L06C16.n4",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L06.C17": {
          "type": "linear",
          "nodes": [
            {
              "id": "L06C17.start",
              "effect": null
            },
            {
              "id": "L06C17.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L06C17.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L06C17.n3",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L06.A",
          "name": "Athena's Rattle A",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "divinity_delta": 1
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L06.A.blue",
              "type": "odd_even_toggle",
              "spirit_cost": 2
            }
          ],
          "gold": [],
          "restart_cost": -2,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L06.B",
          "name": "Athena's Rattle B",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "divinity_delta": 1
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L06.B.blue",
              "type": "set_any",
              "spirit_cost": 2
            }
          ],
          "gold": [],
          "restart_cost": -2,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L06.C",
          "name": "Athena's Rattle C",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "divinity_delta": 1
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L06.C.gold",
              "requirement": {
                "type": "any_die"
              },
              "effect": {
                "spirit_delta": 1
              }
            }
          ],
          "restart_cost": -1,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L06.D",
          "name": "Athena's Rattle D",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "divinity_delta": 1
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L06.D.gold",
              "requirement": {
                "type": "exact_die",
                "value": 5
              },
              "effect": {
                "block_spirit": 2
              }
            }
          ],
          "restart_cost": -1,
          "side_effects": [],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L07",
      "number": 7,
      "name": "Cretan Bull",
      "attack": {
        "scope": "target",
        "target_id": "labor.L07.d1",
        "requirement": {
          "type": "three_plus_x_lte_y",
          "dice_count": 3
        },
        "damage": 1
      },
      "tracks": {
        "track.L07": {
          "type": "branching_graph",
          "start": "L07.start",
          "nodes": {
            "L07.start": {
              "effect": null,
              "next": [
                "L07.R1",
                "L07.L1"
              ]
            },
            "L07.R1": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "L07.R2"
              ]
            },
            "L07.R2": {
              "effect": {
                "heal": 1
              },
              "next": [
                "L07.R3"
              ]
            },
            "L07.R3": {
              "effect": {
                "spirit_delta": -3
              },
              "next": [
                "L07.RR1",
                "L07.RL1"
              ]
            },
            "L07.RR1": {
              "effect": {
                "heal": 1
              },
              "next": [
                "L07.RR2"
              ]
            },
            "L07.RR2": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "L07.RR3"
              ]
            },
            "L07.RR3": {
              "effect": {
                "divinity_delta": -1
              },
              "next": [
                "L07.RR4"
              ]
            },
            "L07.RR4": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "L07.RR5"
              ]
            },
            "L07.RR5": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "L07.skull"
              ]
            },
            "L07.RL1": {
              "effect": {
                "break_hercules_die": 1
              },
              "next": [
                "L07.RL2"
              ]
            },
            "L07.RL2": {
              "effect": {
                "heal": 1
              },
              "next": [
                "L07.M1"
              ]
            },
            "L07.L1": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "L07.L2"
              ]
            },
            "L07.L2": {
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              },
              "next": [
                "L07.L3"
              ]
            },
            "L07.L3": {
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              },
              "next": [
                "L07.L4"
              ]
            },
            "L07.L4": {
              "effect": {
                "heal": 2
              },
              "next": [
                "L07.L5"
              ]
            },
            "L07.L5": {
              "effect": {
                "break_hercules_die": 1
              },
              "next": [
                "L07.M1"
              ]
            },
            "L07.M1": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "L07.M2"
              ]
            },
            "L07.M2": {
              "effect": {
                "heal": 2
              },
              "next": [
                "L07.M3"
              ]
            },
            "L07.M3": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "L07.skull"
              ]
            },
            "L07.skull": {
              "effect": {
                "failure": "skull"
              },
              "next": []
            }
          }
        }
      },
      "rewards": [
        {
          "id": "reward.L07.A",
          "name": "Wrath of Hera A",
          "bonus": [
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L07.A.blue",
              "type": "modify_pip",
              "delta": [
                -1,
                1
              ],
              "wrap": true
            }
          ],
          "gold": [],
          "restart_cost": -1,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L07.B",
          "name": "Wrath of Hera B",
          "bonus": [
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L07.B.blueA",
              "type": "increment_pip",
              "wrap": true
            },
            {
              "id": "ability.reward.L07.B.blueB",
              "type": "increment_pip",
              "wrap": true
            }
          ],
          "gold": [],
          "restart_cost": -1,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9",
      "labor_dice": [
        {
          "id": "labor.L07.d1",
          "start_health": 12,
          "track_id": "track.L07",
          "entry": "L07.start",
          "physical_representation": {
            "kind": "stacked_gold_labor_dice",
            "physical_die_count": 2,
            "verified_start_faces": [
              6,
              6
            ],
            "rules_semantics": "representation_only",
            "independently_targetable": false,
            "independent_health": false,
            "independent_track_position": false,
            "independent_defeat_check": false
          }
        }
      ],
      "health_semantics": {
        "logical_health_entity_count": 1,
        "damage_per_valid_attack": 1,
        "healing_cap": 12,
        "track_advancement_count_per_round": 1
      }
    },
    {
      "id": "labor.L08",
      "number": 8,
      "name": "Mares of Diomedes",
      "labor_dice": [
        {
          "id": "labor.L08.A",
          "start_health": 6,
          "track_id": "track.L08.A"
        },
        {
          "id": "labor.L08.B",
          "start_health": 6,
          "track_id": "track.L08.B"
        }
      ],
      "attack": {
        "scope": "all_active_targets",
        "requirement": {
          "type": "fixed_straight",
          "values": [
            1,
            2,
            3
          ]
        },
        "damage": 1
      },
      "tracks": {
        "track.L08.A": {
          "type": "linear",
          "nodes": [
            {
              "id": "L08A.start",
              "effect": null
            },
            {
              "id": "L08A.n1",
              "effect": {
                "spirit_delta": -3
              }
            },
            {
              "id": "L08A.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L08A.n3",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L08A.n4",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L08A.n5",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L08A.n6",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L08A.n7",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L08.B": {
          "type": "linear",
          "nodes": [
            {
              "id": "L08B.start",
              "effect": null
            },
            {
              "id": "L08B.n1",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L08B.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L08B.n3",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L08B.n4",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L08B.n5",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L08B.n6",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L08B.n7",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L08B.n8",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L08B.n9",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L08.A",
          "name": "Zeus' Disregard A",
          "bonus": [
            {
              "spirit_delta": 2
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L08.A.blue",
              "type": "flip_opposite_side"
            }
          ],
          "gold": [],
          "restart_cost": -1,
          "side_effects": [
            {
              "add_mood": "mood.ghost_abderus"
            },
            {
              "remove_mood": "mood.enraged"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L08.B",
          "name": "Zeus' Disregard B",
          "bonus": [
            {
              "spirit_delta": 2
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L08.B.mood_redraw",
              "type": "mood_redraw_next_ordered_no_rng"
            }
          ],
          "gold": [],
          "restart_cost": -3,
          "side_effects": [
            {
              "add_mood": "mood.ghost_abderus"
            },
            {
              "remove_mood": "mood.enraged"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L09",
      "number": 9,
      "name": "Belt of Hippolyta",
      "labor_dice": [
        {
          "id": "labor.L09.left3",
          "start_health": 3,
          "track_id": "track.L09.left3"
        },
        {
          "id": "labor.L09.right3",
          "start_health": 3,
          "track_id": "track.L09.right3"
        },
        {
          "id": "labor.L09.center6",
          "start_health": 6,
          "track_id": "track.L09.center6"
        }
      ],
      "attack": {
        "scope": "all_active_targets",
        "requirement": {
          "type": "multiplication_equals_sum_of_others"
        },
        "damage": 1
      },
      "tracks": {
        "track.L09.left3": {
          "type": "linear",
          "nodes": [
            {
              "id": "L09L.start",
              "effect": null
            },
            {
              "id": "L09L.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L09L.n2",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L09L.n3",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L09L.n4",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L09L.n5",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L09L.n6",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L09L.n7",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L09.right3": {
          "type": "linear",
          "nodes": [
            {
              "id": "L09R.start",
              "effect": null
            },
            {
              "id": "L09R.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L09R.n2",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L09R.n3",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L09R.n4",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L09R.n5",
              "effect": {
                "spirit_delta": -3
              }
            },
            {
              "id": "L09R.n6",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L09R.n7",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L09.center6": {
          "type": "linear",
          "nodes": [
            {
              "id": "L09C.start",
              "effect": null
            },
            {
              "id": "L09C.n1",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L09C.n2",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L09C.n3",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L09C.n4",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L09C.n5",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L09.A",
          "name": "Blood of the Amazons A",
          "bonus": [
            {
              "spirit_delta": 2
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L09.A.blue",
              "type": "temporary_derived_contribution",
              "count": 1,
              "same_value_as_source": true,
              "source_and_derived_independent_allocation": true
            }
          ],
          "gold": [],
          "restart_cost": -2,
          "side_effects": [
            {
              "add_mood": "mood.ghost_hippolyta"
            },
            {
              "remove_mood": "mood.ferocious"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L09.B",
          "name": "Blood of the Amazons B",
          "bonus": [
            {
              "spirit_delta": 2
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L09.B.gold",
              "requirement": {
                "type": "exact_values",
                "values": [
                  6,
                  3
                ]
              },
              "effect": {
                "divinity_delta": 2
              }
            }
          ],
          "restart_cost": -1,
          "side_effects": [
            {
              "add_mood": "mood.ghost_hippolyta"
            },
            {
              "remove_mood": "mood.ferocious"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L10",
      "number": 10,
      "name": "Cattle of Geryon",
      "labor_dice": [
        {
          "id": "labor.L10.LO",
          "start_health": 5,
          "track_id": "track.L10.LO",
          "attack_group": "left"
        },
        {
          "id": "labor.L10.LI",
          "start_health": 2,
          "track_id": "track.L10.LI",
          "attack_group": "left"
        },
        {
          "id": "labor.L10.RI",
          "start_health": 2,
          "track_id": "track.L10.RI",
          "attack_group": "right"
        },
        {
          "id": "labor.L10.RO",
          "start_health": 5,
          "track_id": "track.L10.RO",
          "attack_group": "right"
        }
      ],
      "attacks": {
        "left": {
          "type": "variable_straight",
          "length": 3
        },
        "right": {
          "type": "matching_triple"
        }
      },
      "tracks": {
        "track.L10.LO": {
          "type": "linear",
          "nodes": [
            {
              "id": "L10LO.start",
              "effect": null
            },
            {
              "id": "L10LO.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10LO.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10LO.n3",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10LO.n4",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10LO.n5",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L10LO.n6",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L10LO.n7",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L10LO.n8",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L10.LI": {
          "type": "linear",
          "nodes": [
            {
              "id": "L10LI.start",
              "effect": null
            },
            {
              "id": "L10LI.n1",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L10LI.n2",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L10LI.n3",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L10LI.n4",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L10LI.n5",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L10.RI": {
          "type": "linear",
          "nodes": [
            {
              "id": "L10RI.start",
              "effect": null
            },
            {
              "id": "L10RI.n1",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L10RI.n2",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L10RI.n3",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L10RI.n4",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L10RI.n5",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L10.RO": {
          "type": "linear",
          "nodes": [
            {
              "id": "L10RO.start",
              "effect": null
            },
            {
              "id": "L10RO.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10RO.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10RO.n3",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10RO.n4",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L10RO.n5",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L10RO.n6",
              "effect": {
                "spirit_delta": -3
              }
            },
            {
              "id": "L10RO.n7",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L10RO.n8",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [
        {
          "id": "reward.L10.A",
          "name": "Helios' Golden Cup A",
          "bonus": [
            {
              "spirit_delta": 3
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L10.A.blueA",
              "type": "modify_pip",
              "delta": [
                -1,
                1
              ],
              "wrap": true
            },
            {
              "id": "ability.reward.L10.A.blueB",
              "type": "modify_pip",
              "delta": [
                -1,
                1
              ],
              "wrap": true
            }
          ],
          "gold": [],
          "restart_cost": -2,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L10.B",
          "name": "Helios' Golden Cup B",
          "bonus": [
            {
              "spirit_delta": 3
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L10.B.gold",
              "requirement": {
                "type": "one_even_one_odd"
              },
              "effect": {
                "divinity_delta": 1
              }
            }
          ],
          "restart_cost": -1,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L10.C",
          "name": "Helios' Golden Cup C",
          "bonus": [
            {
              "spirit_delta": 3
            }
          ],
          "blue": [
            {
              "id": "ability.reward.L10.C.blueA",
              "type": "flip_opposite_side"
            },
            {
              "id": "ability.reward.L10.C.blueB",
              "type": "flip_opposite_side"
            }
          ],
          "gold": [],
          "restart_cost": -2,
          "side_effects": [
            {
              "remove_prior_reward": 1
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L11",
      "number": 11,
      "name": "Apples of the Hesperides",
      "labor_dice": [
        {
          "id": "labor.L11.left",
          "start_health": 6,
          "entry": "A1"
        },
        {
          "id": "labor.L11.right",
          "start_health": 6,
          "entry": "A3"
        }
      ],
      "attack": {
        "scope": "all_active_targets",
        "requirement": {
          "type": "variable_straight",
          "length": 4
        },
        "damage": 1
      },
      "tracks": {
        "track.L11": {
          "type": "shared_directed_graph",
          "nodes": {
            "A1": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "A2",
                "B1",
                "B2"
              ]
            },
            "A2": {
              "effect": {
                "heal": 1
              },
              "next": [
                "B2",
                "B3"
              ]
            },
            "A3": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "A2",
                "B3",
                "B4"
              ]
            },
            "B1": {
              "effect": {
                "heal": 1
              },
              "next": [
                "B2"
              ]
            },
            "B2": {
              "effect": {
                "spirit_delta": -3
              },
              "next": [
                "C1"
              ]
            },
            "B3": {
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              },
              "next": [
                "B2",
                "B4",
                "C2",
                "C3"
              ]
            },
            "B4": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "C3",
                "C4"
              ]
            },
            "C1": {
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              },
              "next": [
                "C2",
                "D2"
              ]
            },
            "C2": {
              "effect": {
                "heal": 2
              },
              "next": [
                "D2",
                "D3"
              ]
            },
            "C3": {
              "effect": {
                "spirit_delta": -3
              },
              "next": [
                "C2",
                "C4",
                "D3"
              ]
            },
            "C4": {
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              },
              "next": [
                "D4"
              ]
            },
            "D1": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "E1"
              ]
            },
            "D2": {
              "effect": {
                "heal": 1
              },
              "next": [
                "D1",
                "E2"
              ]
            },
            "D3": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "D4",
                "E2"
              ]
            },
            "D4": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "E3",
                "E4"
              ]
            },
            "E1": {
              "effect": {
                "divinity_delta": -1
              },
              "next": [
                "E2",
                "F1"
              ]
            },
            "E2": {
              "effect": {
                "break_hercules_die": 1
              },
              "next": [
                "F2",
                "F3"
              ]
            },
            "E3": {
              "effect": {
                "divinity_delta": -1
              },
              "next": [
                "E2",
                "F4"
              ]
            },
            "E4": {
              "effect": {
                "spirit_delta": -3
              },
              "next": [
                "E3",
                "F4"
              ]
            },
            "F1": {
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              },
              "next": [
                "F2"
              ]
            },
            "F2": {
              "effect": {
                "heal": 2
              },
              "next": [
                "SKULL"
              ]
            },
            "F3": {
              "effect": {
                "spirit_delta": -2
              },
              "next": [
                "F2",
                "SKULL"
              ]
            },
            "F4": {
              "effect": {
                "spirit_delta": -1
              },
              "next": [
                "F3"
              ]
            },
            "SKULL": {
              "effect": {
                "failure": "skull"
              },
              "next": []
            }
          }
        }
      },
      "rewards": [
        {
          "id": "reward.L11.A",
          "name": "Golden Apples A",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L11.A.gold",
              "requirement": {
                "type": "exact_die",
                "value": 6
              },
              "effect": {
                "spirit_delta": 2
              }
            }
          ],
          "restart_cost": -2,
          "side_effects": [
            {
              "add_mood": "mood.weight_of_atlas"
            },
            {
              "remove_mood": "mood.resolute"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L11.B",
          "name": "Golden Apples B",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L11.B.gold",
              "requirement": {
                "type": "exact_die",
                "value": 5
              },
              "effect": {
                "divinity_delta": 1
              }
            }
          ],
          "restart_cost": -1,
          "side_effects": [
            {
              "add_mood": "mood.weight_of_atlas"
            },
            {
              "remove_mood": "mood.resolute"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        },
        {
          "id": "reward.L11.C",
          "name": "Golden Apples C",
          "bonus": [
            {
              "spirit_delta": 3
            },
            {
              "hercules_dice_delta": 1
            }
          ],
          "blue": [],
          "gold": [
            {
              "id": "ability.reward.L11.C.gold",
              "requirement": {
                "type": "any_die"
              },
              "effect": {
                "block_spirit": 2
              }
            }
          ],
          "restart_cost": -2,
          "side_effects": [
            {
              "add_mood": "mood.weight_of_atlas"
            },
            {
              "remove_mood": "mood.resolute"
            }
          ],
          "status": "owner_verified",
          "provenance": "Gameplay Reference v9"
        }
      ],
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    },
    {
      "id": "labor.L12",
      "number": 12,
      "name": "Cerberus",
      "labor_dice": [
        {
          "id": "labor.L12.A",
          "start_health": 6,
          "track_id": "track.L12.A"
        },
        {
          "id": "labor.L12.B",
          "start_health": 6,
          "track_id": "track.L12.B"
        },
        {
          "id": "labor.L12.C",
          "start_health": 6,
          "track_id": "track.L12.C"
        }
      ],
      "attack": {
        "scope": "all_active_targets",
        "requirement": {
          "type": "exact_sum",
          "sum": 18,
          "min_dice": 1
        },
        "damage": 1,
        "multiple_disjoint_attacks_per_roll": true
      },
      "tracks": {
        "track.L12.A": {
          "type": "linear",
          "nodes": [
            {
              "id": "L12A.start",
              "effect": null
            },
            {
              "id": "L12A.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L12A.n2",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L12A.n3",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L12A.n4",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L12A.n5",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L12A.n6",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L12A.n7",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L12A.n8",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L12A.n9",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L12A.n10",
              "effect": {
                "heal": 2
              }
            },
            {
              "id": "L12A.n11",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L12.B": {
          "type": "linear",
          "nodes": [
            {
              "id": "L12B.start",
              "effect": null
            },
            {
              "id": "L12B.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L12B.n2",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L12B.n3",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L12B.n4",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L12B.n5",
              "effect": {
                "divinity_delta": -1
              }
            },
            {
              "id": "L12B.n6",
              "effect": {
                "spirit_delta": -3
              }
            },
            {
              "id": "L12B.n7",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L12B.n8",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L12B.n9",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        },
        "track.L12.C": {
          "type": "linear",
          "nodes": [
            {
              "id": "L12C.start",
              "effect": null
            },
            {
              "id": "L12C.n1",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L12C.n2",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L12C.n3",
              "effect": {
                "spirit_delta": -2
              }
            },
            {
              "id": "L12C.n4",
              "effect": {
                "spirit_delta": -1,
                "heal": 1
              }
            },
            {
              "id": "L12C.n5",
              "effect": {
                "cannot_block": true
              }
            },
            {
              "id": "L12C.n6",
              "effect": {
                "break_hercules_die": 1
              }
            },
            {
              "id": "L12C.n7",
              "effect": {
                "advance_all_other_active_labor_dice": 1
              }
            },
            {
              "id": "L12C.n8",
              "effect": {
                "spirit_delta": -3
              }
            },
            {
              "id": "L12C.n9",
              "effect": {
                "heal": 1
              }
            },
            {
              "id": "L12C.n10",
              "effect": {
                "spirit_delta": -1
              }
            },
            {
              "id": "L12C.n11",
              "effect": {
                "failure": "skull"
              }
            }
          ]
        }
      },
      "rewards": [],
      "completion": {
        "victory_requires": {
          "all_labors_complete": true,
          "divinity_at_top": true
        }
      },
      "status": "owner_verified",
      "provenance": "Gameplay Reference v9"
    }
  ],
  "hercules_die_pool_identity_policy": {
    "stable_ids": [
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "H7",
      "H8",
      "H9",
      "H10",
      "H11"
    ],
    "count_only_temporary_loss": {
      "selection": "highest_available_ids_first",
      "player_choice": false,
      "timing": "labor_setup_before_first_roll"
    },
    "count_only_temporary_gain": {
      "selection": "lowest_unused_ids_first",
      "player_choice": false,
      "timing": "labor_setup_before_first_roll"
    },
    "restoration": "restore_persistent_base_pool_at_next_labor_setup_then_apply_new_temporary_effects",
    "applies_to": [
      "mood.resolute",
      "mood.battered",
      "mood.weight_of_atlas",
      "mood.ghost_abderus:lose_die_option"
    ],
    "note": "Implementation identity mapping only; Hercules dice have no persistent per-die gameplay traits."
  }
} as const;
