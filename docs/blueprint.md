# GroupGuard — Bot specification

**Archetype:** community

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A lightweight Telegram group moderation bot that automates spam prevention, verification, and admin controls while maintaining a clear and respectful user experience. Enforces human verification on new members, detects spam patterns, and provides admin commands for warnings, mutes, and bans. Stores action logs and allows threshold customization for moderation rules.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram group admins
- Moderators of public/private groups
- Community managers

## Success criteria

- 95% of bot spam is blocked within 30 seconds of joining
- Admins can configure rules and view logs with 3 clicks or less
- Members receive clear explanations for automated actions

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu
- **I'm human** (button, actor: user, callback: verification:confirm) — Confirm human verification for new members
- **/warn** (command, actor: admin, command: /warn) — Issue a warning to a user with reason
- **/mute** (command, actor: admin, command: /mute) — Mute a user for a specified duration
- **/kick** (command, actor: admin, command: /kick) — Kick a user from the group
- **/ban** (command, actor: admin, command: /ban) — Ban a user from the group
- **/trust** (command, actor: admin, command: /trust) — Mark a user as trusted (exempt from spam checks)
- **/untrust** (command, actor: admin, command: /untrust) — Remove a user's trusted status
- **/setwelcome** (command, actor: admin, command: /setwelcome) — Configure the welcome message template
- **/setrules** (command, actor: admin, command: /setrules) — Set the group's moderation rules text
- **/setthresholds** (command, actor: admin, command: /setthresholds) — Configure spam detection thresholds
- **/log** (command, actor: admin, command: /log) — View recent moderation action logs
- **/stats** (command, actor: admin, command: /stats) — Show moderation statistics for the group

## Flows

### New member verification
_Trigger:_ new_member_joined

1. Send welcome message with verification button
2. Wait for verification or timeout
3. If verified: grant full permissions and log
4. If timeout: kick member and post explanation

_Data touched:_ Member, Verification challenge, Infraction events

### Spam detection
_Trigger:_ user_message

1. Track message metadata (links, duplicates, frequency)
2. Check against configured thresholds
3. If threshold exceeded: apply configured action (warn/mute/kick)
4. Notify user and group of action
5. Log infraction event

_Data touched:_ Spam-detection counters, Infraction events, Member

### Admin moderation
_Trigger:_ /warn, /mute, /kick, /ban

1. Validate admin permissions
2. Apply action to target user
3. Record actor, reason, and timestamp
4. Notify group and admin of action

_Data touched:_ Infraction events, Member

### Configuration update
_Trigger:_ /setwelcome, /setrules, /setthresholds

1. Validate admin permissions
2. Update corresponding settings
3. Confirm change with admin

_Data touched:_ Admin settings

### Log access
_Trigger:_ /log

1. Validate admin permissions
2. Fetch recent actions from log
3. Display paginated summary

_Data touched:_ Infraction events, Admin settings

### Trust management
_Trigger:_ /trust, /untrust

1. Validate admin permissions
2. Update user's trusted status
3. Confirm change with admin

_Data touched:_ Member, Admin settings

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Member** _(retention: persistent)_ — User profile and moderation status
  - fields: user_id, display_name, join_time, verification_status, trusted, message_history
- **Verification challenge** _(retention: session)_ — Verification state for new members
  - fields: user_id, timestamp, confirmed
- **Infraction events** _(retention: persistent)_ — Moderation actions taken
  - fields: user_id, action_type, actor, reason, timestamp
- **Spam-detection counters** _(retention: session)_ — Message activity tracking for spam detection
  - fields: user_id, message_count, link_count, duplicate_count, last_message_time
- **Admin settings** _(retention: persistent)_ — Group-specific configuration
  - fields: welcome_text, rules_text, thresholds, auto_actions, trusted_users, admin_notification_target

## Integrations

- **Telegram** (required) — Bot API messaging and moderation actions
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure welcome message and rules text
- Set spam detection thresholds and auto-actions
- Manage trusted users list
- View and filter action logs
- Adjust admin notification preferences

## Notifications

- In-group action explanations for users
- Admin notifications for moderation actions
- Periodic summary messages in admin channel

## Permissions & privacy

- Only admins can access logs and configuration
- User data is stored only for moderation purposes
- No personal data collected beyond what's necessary for moderation

## Edge cases

- Multiple admins acting on the same user simultaneously
- Verification timeout during network issues
- Users sending identical messages in parallel threads
- Admin commands issued while bot is processing another action

## Required tests

- Verify new member verification flow with timeout handling
- Test spam detection thresholds trigger correct actions
- Validate admin command permissions and logging
- Confirm action log pagination and filtering
- Test trusted user exemptions from spam checks

## Assumptions

- Admins will configure reasonable thresholds to avoid false positives
- Group owners will maintain the trusted users list
- Moderation actions will be used in accordance with Telegram's terms of service
