# PolarOps — Architecture

Full diagram (system architecture + process flowchart):
https://claude.ai/artifact/ABkgeAYkhC9D7EZ4wJmqm1

Offline sync uses Dexie.js on the frontend with an outbox queue pattern — see the
Frontend and Backend sections of the team guide for how the sync contract works.