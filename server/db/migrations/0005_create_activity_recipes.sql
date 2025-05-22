
-- Create activity_recipes table
CREATE TABLE IF NOT EXISTS activity_recipes (
    id SERIAL PRIMARY KEY,
    activityId INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT[] NOT NULL,
    instructions TEXT[] NOT NULL,
    prepTime INTEGER NOT NULL,
    cookTime INTEGER NOT NULL,
    servings INTEGER NOT NULL,
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activity_recipes_activity_id ON activity_recipes(activityId);
CREATE INDEX IF NOT EXISTS idx_activity_recipes_difficulty ON activity_recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_activity_recipes_tags ON activity_recipes USING GIN (tags);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activity_recipes_updated_at
    BEFORE UPDATE ON activity_recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
