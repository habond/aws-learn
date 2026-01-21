-- Create table for processed data
CREATE TABLE sales_data (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  product VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  revenue DECIMAL(10,2) NOT NULL,
  region VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_date ON sales_data(date);
CREATE INDEX idx_product ON sales_data(product);
CREATE INDEX idx_region ON sales_data(region);

-- Verify
\dt
\d sales_data
