# Player Market Data-Permission Checklist

No provider is assumed to grant any item below. Approval requires written evidence and a named human reviewer.

Record an explicit yes/no determination for whether the intended source permits:

- [ ] Retrieving player identity and squad data.
- [ ] Retaining that information after the API response.
- [ ] Storing it in FootballIQ's database.
- [ ] Publicly displaying player names, clubs and positions.
- [ ] Creating a derived 50-player catalogue.
- [ ] Periodically refreshing the information.
- [ ] Displaying historical records after provider access ends.
- [ ] Using provider player IDs internally.
- [ ] Commercial use if FootballIQ later introduces subscriptions.
- [ ] Compliance with all attribution, deletion and refresh obligations.

Required approval evidence:

- Source/provider and applicable plan or contract.
- Exact terms/version and retrieval date.
- Evidence reference or internal legal memo.
- Required attribution wording and placement, if any.
- Retention/deletion deadline and refresh obligations.
- Approved reviewer name and ISO-8601 approval timestamp.

Every item must be explicitly approved in the local export's `permissionApproval.permissions` object. A missing or false item, missing evidence reference, unnamed reviewer or invalid timestamp blocks selection and produces no activation-ready catalogue.
