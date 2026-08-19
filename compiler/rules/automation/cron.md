# Scheduled Tasks (Cron)

## Capability

Scheduled and recurring tasks using `node-cron` for automation, background
jobs, and periodic execution.

## Purpose

Let users define scheduled tasks in readable Plain for automation workflows
like data syncing, report generation, cleanup jobs, and periodic notifications.

## Supported Plain syntax

### 1. Schedule a task with a cron expression

```plain
schedule task "* * * * *" as
  show "Running every minute: " + date()
done
```

### 2. Schedule with a descriptive schedule

```plain
every 5 minutes as
  show "Heartbeat"
done
```

### 3. Named scheduled task

```plain
remember cleanup as schedule task "0 2 * * *" as
  show "Running daily cleanup at 2 AM"
done
```

### 4. Async scheduled task

```plain
schedule task "0 * * * *" as
  remember response as await fetch "https://api.example.com/status"
  if response is ok
    remember data as await response.json()
    show "Status: " + data.status
  done
done
```

### 5. Multiple scheduled tasks

```plain
schedule task "*/5 * * * *" as
  show "heartbeat"
done

schedule task "0 2 * * *" as
  show "daily cleanup"
done
```

## Semantic meaning

- `schedule task "<cron>" as ... done` registers a recurring task using a
  standard cron expression. The body executes on the schedule.
- `every <n> minutes as ... done` is a shorthand for common intervals.
- `remember <name> as schedule task ...` binds the scheduled task to a variable
  for later reference.
- Cron expressions follow the standard 5-field format:
  `minute hour day-of-month month day-of-week`.

## JavaScript target

```js
const cron = require("node-cron");

cron.schedule("* * * * *", () => {
  console.log("Running every minute: " + new Date().toISOString());
});
```

Named task:

```js
const cron = require("node-cron");

const cleanup = cron.schedule("0 2 * * *", () => {
  console.log("Running daily cleanup at 2 AM");
});
```

## Dependency

- `node-cron`

## Imports / runtime requirements

- No project imports required by the rule itself.
- `node-cron` must be installed by the normal dependency system.

## Async behavior

Async-capable. The scheduled task body may contain async operations that
are awaited.

## Examples

```plain
schedule task "* * * * *" as
  show "tick: " + date()
done
```

## Invalid forms

- `schedule task` without a cron expression string.
- Missing `as` or `done` keywords.
- Using a cron expression with fewer or more than 5 fields.

## Security considerations

- Scheduled tasks run in the same process as the main application.
- Do not schedule tasks that execute untrusted input or shell commands.
- Be mindful of resource usage with high-frequency schedules.

## Expected compiler output

```json
{
  "javascript": "<generated cron code>",
  "dependencies": ["node-cron"],
  "imports": [],
  "async": true
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `cron` rule for a scheduling source;
  mocked translation passes validation.
