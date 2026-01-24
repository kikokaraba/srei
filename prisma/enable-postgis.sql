-- Enable PostGIS extension for geospatial data
-- This is required for the Property.coordinates and UrbanDevelopment.coordinates fields
CREATE EXTENSION IF NOT EXISTS postgis;
