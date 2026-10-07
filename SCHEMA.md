# Saved pressure sore schema

`care_pressure_sore_fe.pressure_sore_chart` supports patient and encounter questionnaires. It is a repeating group. **One row represents one sore**, and multiple rows at the same location are allowed. Rows have no separate persistent wound identifier, so their numbers indicate position within this response, not identity across visits.

The executable schema is `src/lib/group.ts`. CARE assigns child question IDs and scopes local keys as `<group.link_id>__<key>`.

| Local key        | Question type | Required                                      | Values / units                                              |
| ---------------- | ------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `region`         | choice        | Yes, in every row                             | One of the 40 body-map path IDs below, or `other`           |
| `length`         | decimal       | No; paired with width when both fields exist  | Finite nonnegative number, centimetres                      |
| `width`          | decimal       | No; paired with length when both fields exist | Finite nonnegative number, centimetres                      |
| `exudate_amount` | choice        | No                                            | `none`, `light`, `moderate`, `heavy`                        |
| `tissue_type`    | choice        | No                                            | `closed`, `epithelial`, `granulation`, `slough`, `necrotic` |
| `description`    | text          | No                                            | Free text                                                   |

Dimensions use decimal answers with units in their question labels. They do not submit coded quantity units or automatically create Observations. Region codes are choice values, not body-site metadata.

## Region codes

Anterior: `anterior_head`, `anterior_neck`, `anterior_right_shoulder`, `anterior_right_chest`, `anterior_right_arm`, `anterior_right_forearm`, `anterior_right_hand`, `anterior_left_hand`, `anterior_left_chest`, `anterior_left_shoulder`, `anterior_left_arm`, `anterior_left_forearm`, `anterior_right_foot`, `anterior_left_foot`, `anterior_right_leg`, `anterior_lower_chest`, `anterior_abdomen`, `anterior_left_leg`, `anterior_right_thigh`, `anterior_left_thigh`, `anterior_groin`.

Posterior: `posterior_head`, `posterior_neck`, `posterior_left_chest`, `posterior_right_chest`, `posterior_abdomen`, `posterior_left_shoulder`, `posterior_right_shoulder`, `posterior_left_arm`, `posterior_left_forearm`, `posterior_left_hand`, `posterior_right_arm`, `posterior_right_forearm`, `posterior_right_hand`, `posterior_left_thigh_and_buttock`, `posterior_right_thigh_and_buttock`, `posterior_left_leg`, `posterior_right_leg`, `posterior_left_foot`, `posterior_right_foot`.

`other` is available through the location select and has no SVG path. Use notes to describe it.

## Validation and editing

- CARE enforces required locations and, if selected in the builder, at least one row.
- The manifest callback checks scalar cardinality, saved choice membership, finite nonnegative dimensions and string notes. If both dimension questions exist in the saved schema, recording either requires recording the other. Both may be zero or both positive.
- Empty means unrecorded. Zero remains an explicit numeric answer. New rows have only the chosen location; no clinical findings default to negative/normal values.
- Clearing an input writes `values: []`. Removing a row removes all its child answers. Removal is disabled if any present child is hidden or locked.
- Repeated locations and identical rows are allowed because separate sores can share a body region. Edits and removals use CARE's supplied row callbacks.
- The schema declares no child conditions. Missing optional children in older forms are omitted; pair validation applies only when both saved dimension questions exist. Saved choice options govern rendering and validation. CARE handles incompatible-schema repair and missing-plugin fallback. Repair does not migrate historical answers.

## Derived display

Selected map location, row numbers, region counts, and area are presentation only. Area is length × width in cm² and is displayed only when both dimensions are valid; the display rounds to two decimal places. This plugin does not infer injury stage or a healing score.

Read-only and print views retain every row's recorded fields and location text. Hidden bindings are omitted. Translation labels are separate from stored choice identities.

## Submission example

Illustrative **saved question IDs** are used below. Each repeated row has ordinary child results. Frontend decimal values use `{ "type": "number", "value": 2 }`; CARE serializes numeric values as strings and removes the frontend type discriminator. Empty children are omitted.

```json
{
  "question_id": "saved-pressure-sore-group",
  "sub_results": [
    [
      {
        "question_id": "saved-region",
        "values": [{ "value": "posterior_left_foot" }]
      },
      { "question_id": "saved-length", "values": [{ "value": "2" }] },
      { "question_id": "saved-width", "values": [{ "value": "1.5" }] },
      {
        "question_id": "saved-exudate_amount",
        "values": [{ "value": "light" }]
      },
      {
        "question_id": "saved-tissue_type",
        "values": [{ "value": "granulation" }]
      },
      {
        "question_id": "saved-description",
        "values": [{ "value": "First sore" }]
      }
    ],
    [
      {
        "question_id": "saved-region",
        "values": [{ "value": "posterior_left_foot" }]
      },
      {
        "question_id": "saved-description",
        "values": [
          { "value": "Second sore, separate site within the same region" }
        ]
      }
    ]
  ]
}
```
