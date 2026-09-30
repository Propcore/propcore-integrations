Your Propcore projects, units and live availability, inside an EmDash site. Install from the EmDash registry, enter your Propcore site slug and source key, and your pages can read the catalog from three routes.

## Routes

    GET /_emdash/api/plugins/propcore/projects
    GET /_emdash/api/plugins/propcore/units?project=<project_id>
    GET /_emdash/api/plugins/propcore/availability?project=<project_id>   (live)

Responses are `{ "success": true, "data": ... }`. Fields are exactly what Propcore returns (snake_case).
