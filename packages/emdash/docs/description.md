Your Propcore projects, units and live availability, inside an EmDash site. Install from the EmDash registry, enter your Propcore site slug and source key, and your pages can read the catalog from three routes. `projects` returns up to 100 projects. `units` returns 100 units per page; pass `cursor=<value from the previous response>` for the next page. `availability` makes one live request to Propcore per call and works only for projects that have been synced. The sync reads the whole catalog in one request; it is tested with 119 units, and larger catalogs are planned.

## Routes

    GET /_emdash/api/plugins/propcore/projects
    GET /_emdash/api/plugins/propcore/units?project=<project_id>
    GET /_emdash/api/plugins/propcore/availability?project=<project_id>   (live)

Responses are `{ "success": true, "data": ... }`. Fields are exactly what Propcore returns (snake_case).
