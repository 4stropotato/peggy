# Cloud Native Build Owner Checklist (Windows + iPhone)

Last updated: 2026-02-09

Purpose:
- This is the list of items **you** need to complete so we can ship a native iOS build without local Mac.
- Keep this file updated and do not share secrets in Git.

## A. Must-Do First (Owner)

- [ ] Enroll in Apple Developer Program (paid account required for real iPhone distribution/TestFlight/App Store).
- [ ] Confirm you can access:
- Apple Developer portal
- App Store Connect
- Team ID

## B. App Identity Decisions (Owner)

- [ ] Finalize app display name (example: `Peggy`).
- [ ] Finalize iOS bundle id (example: `io.4stropotato.peggy`).
- [ ] Finalize App Group id for widget data sharing (example: `group.io.4stropotato.peggy`).
- [ ] Confirm supported regions/countries for release.

## C. Credentials To Prepare (Owner)

Choose one path:

### Option 1: App Store Connect API Key (recommended)
- [ ] Create API key in App Store Connect (Issuer ID, Key ID, private key `.p8`).
- [ ] Store safely outside repo (password manager or secure vault).

### Option 2: Apple ID login path
- [ ] Ensure Apple ID has 2FA enabled.
- [ ] Generate app-specific password.

## D. Build Provider Setup (Owner + AI)

- [ ] Choose provider (recommended: Expo EAS cloud build).
- [ ] Create provider account.
- [ ] Confirm project ownership and billing tier.
- [ ] Add required secrets in provider dashboard (never commit secrets).

## E. Secrets Checklist (Owner)

Never place these in git:
- [ ] `APPLE_TEAM_ID`
- [ ] `APPLE_BUNDLE_ID`
- [ ] `APPLE_APP_GROUP_ID`
- [ ] `ASC_ISSUER_ID` (if using API key)
- [ ] `ASC_KEY_ID` (if using API key)
- [ ] `ASC_PRIVATE_KEY_P8` (if using API key)
- [ ] `APPLE_ID` / app-specific password (if using login path)

## F. What AI Will Do After You Finish A-E

Once your credentials are ready, I will:
1. Add cloud build config files.
2. Wire environment variables/secrets references.
3. Prepare iOS native build command flow.
4. Add release checklist for TestFlight submission.
5. Validate build artifacts and document rollback.

## G. Release-Readiness Checks (Owner)

- [ ] Privacy Policy URL ready.
- [ ] Support contact email ready.
- [ ] App icon/splash assets finalized.
- [ ] Notification permission copy finalized.
- [ ] Location usage description finalized.
- [ ] Screenshots for App Store prepared (if App Store release target).

## H. Quick Status Tracker

- Owner Status: `NOT STARTED`
- Last Updated By: `owner`
- Notes:
- Add date + short update each time you complete a checkbox.

