package com.erp.common.redis.service;

import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class RedisService {

    private final StringRedisTemplate redisTemplate;

    public RedisService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // --- String operations ---

    public void set(String key, String value) {
        ValueOperations<String, String> ops = redisTemplate.opsForValue();
        ops.set(key, value);
    }

    public void set(String key, String value, long timeout, TimeUnit unit) {
        ValueOperations<String, String> ops = redisTemplate.opsForValue();
        ops.set(key, value, timeout, unit);
    }

    public String get(String key) {
        ValueOperations<String, String> ops = redisTemplate.opsForValue();
        return ops.get(key);
    }

    public Boolean delete(String key) {
        return redisTemplate.delete(key);
    }

    public Boolean expire(String key, long timeout, TimeUnit unit) {
        return redisTemplate.expire(key, timeout, unit);
    }

    public Boolean hasKey(String key) {
        return redisTemplate.hasKey(key);
    }

    public Long getExpire(String key) {
        return redisTemplate.getExpire(key);
    }

    // --- Hash operations ---

    public void hSet(String key, String hashKey, String value) {
        HashOperations<String, String, String> ops = redisTemplate.opsForHash();
        ops.put(key, hashKey, value);
    }

    public void hSetAll(String key, Map<String, String> map) {
        HashOperations<String, String, String> ops = redisTemplate.opsForHash();
        ops.putAll(key, map);
    }

    public String hGet(String key, String hashKey) {
        HashOperations<String, String, String> ops = redisTemplate.opsForHash();
        return ops.get(key, hashKey);
    }

    public Map<String, String> hGetAll(String key) {
        HashOperations<String, String, String> ops = redisTemplate.opsForHash();
        return ops.entries(key);
    }

    public void hDelete(String key, String... hashKeys) {
        HashOperations<String, String, String> ops = redisTemplate.opsForHash();
        ops.delete(key, (Object[]) hashKeys);
    }
}
