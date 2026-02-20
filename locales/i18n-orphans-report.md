# I18n Orphans Report

Generated: 2026-02-20
Scope: frontend keys detected from `useTranslations(...)` usage in `src/**/*.ts(x)`.

## Summary

- Used exact keys: **297**
- Used dynamic patterns (template literals): **35**
- Unused keys in `es.json`: **198**
- Unused keys in `en.json`: **198**
- Unused keys in `br.json`: **171**
- Shared unused keys across all 3 locales (safest prune candidates): **171**

## Shared Unused by Namespace

- `DaisuHome`: 32
- `ChatPage`: 27
- `Dashboard`: 21
- `News`: 20
- `Common`: 17
- `LanguagePage`: 13
- `Footer`: 10
- `ChatComponent`: 8
- `About`: 7
- `Acknowledgments`: 6
- `Header`: 4
- `ProfilePage`: 3
- `LanguagesPage`: 1
- `LocaleSwitcher`: 1
- `Resources`: 1

## Top Shared Orphans (sample)

- `About.historyContent`
- `About.historyTitle`
- `About.missionContent`
- `About.missionTitle`
- `About.title`
- `About.valuesContent`
- `About.valuesTitle`
- `Acknowledgments.backend-developer`
- `Acknowledgments.brtranslator`
- `Acknowledgments.communityManager`
- `Acknowledgments.contentCreator`
- `Acknowledgments.designer`
- `Acknowledgments.frontend-developer`
- `ChatComponent.create`
- `ChatComponent.createRoom`
- `ChatComponent.liveChat`
- `ChatComponent.pleaseLogIn`
- `ChatComponent.roomName`
- `ChatComponent.rooms`
- `ChatComponent.send`
- `ChatComponent.writeMessage`
- `ChatPage.activeChats`
- `ChatPage.chatRooms`
- `ChatPage.create`
- `ChatPage.createNewRoom`
- `ChatPage.createRoom.button`
- `ChatPage.header.online`
- `ChatPage.header.selectRoom`
- `ChatPage.langSelector.langs.en`
- `ChatPage.langSelector.langs.es`
- `ChatPage.langSelector.langs.pt`
- `ChatPage.participants`
- `ChatPage.profile.close`
- `ChatPage.profile.learning`
- `ChatPage.profile.native`
- `ChatPage.prompt.close`
- `ChatPage.prompt.topic`
- `ChatPage.report.harassment`
- `ChatPage.report.inappropriate`
- `ChatPage.report.offensive`
- `ChatPage.report.other`
- `ChatPage.report.spam`
- `ChatPage.roomName`
- `ChatPage.rooms`
- `ChatPage.search`
- `ChatPage.selectChat`
- `ChatPage.toast.messageFailed`
- `ChatPage.writeMessage`
- `Common.and`
- `Common.back`
- `Common.cancel`
- `Common.close`
- `Common.confirm`
- `Common.delete`
- `Common.edit`
- `Common.error`
- `Common.languages.en`
- `Common.languages.es`
- `Common.languages.pt`
- `Common.loading`
- `Common.no`
- `Common.or`
- `Common.save`
- `Common.success`
- `Common.yes`

## Notes

- This report includes dynamic template key handling (e.g. `t(`items.${id}.title`)`).
- Shared unused keys are safer candidates than locale-specific unused keys.
- Suggested cleanup strategy:
  1. Remove only shared unused keys in small batches.
  2. Run app smoke test after each batch.
  3. Keep a backup commit before each prune step.
