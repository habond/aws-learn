-- Query 1: Average temperature by location
SELECT
  location,
  AVG(temperature) as avg_temp,
  AVG(humidity) as avg_humidity,
  COUNT(*) as reading_count
FROM sensor_data
GROUP BY location
ORDER BY avg_temp DESC;

-- Query 2: High temperature alerts
SELECT
  sensor_id,
  location,
  temperature,
  timestamp
FROM sensor_data
WHERE temperature > 28.0
ORDER BY timestamp DESC
LIMIT 10;

-- Query 3: Hourly averages
SELECT
  DATE_TRUNC('hour', from_iso8601_timestamp(timestamp)) as hour,
  location,
  AVG(temperature) as avg_temp,
  AVG(humidity) as avg_humidity,
  COUNT(*) as readings
FROM sensor_data
GROUP BY DATE_TRUNC('hour', from_iso8601_timestamp(timestamp)), location
ORDER BY hour DESC, location;

-- Query 4: Sensor health check (find sensors not reporting)
SELECT
  sensor_id,
  MAX(timestamp) as last_seen,
  COUNT(*) as total_readings
FROM sensor_data
GROUP BY sensor_id
ORDER BY last_seen DESC;

-- Query 5: Temperature trends over time
SELECT
  DATE(from_iso8601_timestamp(timestamp)) as date,
  location,
  MIN(temperature) as min_temp,
  MAX(temperature) as max_temp,
  AVG(temperature) as avg_temp
FROM sensor_data
GROUP BY DATE(from_iso8601_timestamp(timestamp)), location
ORDER BY date DESC, location;
