// src/shared/infrastructure/redis/registerLockCommands.js

/**
 * Registers Redis Lua commands used for distributed locking.
 *
 * These commands are registered once during infrastructure bootstrap
 * and consumed by RedisLockManager.
 *
 * @param {import("ioredis").Redis} redis
 * @returns {import("ioredis").Redis}
 */
export function registerLockCommands(redis) {

    if (!redis) {
        throw new Error(
            "Redis client is required to register lock commands"
        );
    }


    /**
     * Safely release lock only if token matches.
     */
    if (
        typeof redis.safeReleaseLock !== "function"
    ) {

        redis.defineCommand(
            "safeReleaseLock",
            {
                numberOfKeys: 1,

                lua: `
                    if redis.call("get", KEYS[1]) == ARGV[1]
                    then
                        return redis.call("del", KEYS[1])
                    else
                        return 0
                    end
                `,
            }
        );
    }


    /**
     * Safely extend lock TTL only if token matches.
     */
    if (
        typeof redis.safeExtendLock !== "function"
    ) {

        redis.defineCommand(
            "safeExtendLock",
            {
                numberOfKeys: 1,

                lua: `
                    if redis.call("get", KEYS[1]) == ARGV[1]
                    then
                        return redis.call(
                            "pexpire",
                            KEYS[1],
                            ARGV[2]
                        )
                    else
                        return 0
                    end
                `,
            }
        );
    }


    return redis;
}