---
name: Shared student profile
description: Student profile fields shared across student, admin, and teacher portal views
---

Student identity, contact, guardian, and health information must come from the single profile joined to the student record. Blood type, weight, and height are profile fields, not duplicated portal-specific data.

**Why:** A student update must appear consistently in the student's profile, admin student detail, section roster, and teacher attendance/academic views without conflicting copies.

**How to apply:** Keep the student self-service profile endpoint protected to the owner/admin, expose only the minimum roster fields to authenticated staff, and never return classmates' health data to student roster requests.