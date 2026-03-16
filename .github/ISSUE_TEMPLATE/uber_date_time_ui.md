---
name: Improve driver route date/time UI (Uber-style)
about: Redesign the date and time picker in driver trip creation / rider find-a-ride to match Uber's schedule experience.
title: "[Mobile] Improve driver route date and time UI to match Uber-style schedule"
labels: "enhancement"
assignees: ""
---

## Summary

Improve the date and time selection UI used when creating a driver route (or when a rider searches for a ride) so it matches Uber’s “Schedule Ride” / time-picker experience.

## Current behavior

- Rider “Find a ride” and driver “Create trip” use a simple **LOGISTICS** section with a single date+time picker and a primary action button.
- No “Pickup at” / “Dropoff by” toggle, no ride summary line, no cancellation policy or “See Terms” link, and no dedicated “Choose a time” block that mirrors Uber.

## Desired behavior (Uber-style)

- **“Choose a time”** block with the same visual weight as the ROUTE section (e.g. label + secondary color, consistent typography).
- **Segmented control**: “Pickup at” vs “Dropoff by” to clarify whether the chosen time is pickup or dropoff.
- **Single combined date + time** input (one wheel or one modal with date and time together), not separate date and time flows.
- **Closable picker**: User can confirm (e.g. “Done” / “OK”) and close the picker; it should not be always visible and impossible to dismiss.
- **Ride summary** line (e.g. “X:XX AM pickup time” or “X:XX PM dropoff time”).
- **Cancellation policy** text with a “See Terms” link (e.g. to Uber’s or Hitchly’s terms).
- **Primary action**: Single black (or primary) “Continue” / “Search” button that runs the search or proceeds to the next step.

## Technical notes

- **Android**: `@react-native-community/datetimepicker` only supports `date` and `time` on Android (no `datetime`). Using `mode="datetime"` on Android can trigger `DateTimePickerAndroid.dismiss()` during unmount and crash. Any new implementation should use the imperative Android API (e.g. date then time in sequence) on Android and avoid mounting the inline datetime picker when it would unmount and trigger that cleanup.
- **iOS**: Inline or modal datetime spinner with a clear “Done”/dismiss is fine.

## Acceptance criteria

- [ ] “Choose a time” section matches ROUTE styling (label + secondary color).
- [ ] “Pickup at” / “Dropoff by” toggle is present where applicable.
- [ ] One combined date+time picker, closable after selection.
- [ ] Ride summary line and cancellation policy with “See Terms” link.
- [ ] Single primary “Continue”/“Search” button that triggers the same search/flow as today.
- [ ] No Android crash when opening/closing or hot-reloading the screen (no `dismiss` of undefined).
