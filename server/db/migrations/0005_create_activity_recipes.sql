
CREATE TABLE activity_recipes (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  phase VARCHAR(20) NOT NULL CHECK (phase IN ('planning', 'setup', 'execution', 'cleanup', 'followup')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_recipes_activity_id ON activity_recipes(activity_id);
