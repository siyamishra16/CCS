-- SCHOOL PROFILE TABLES
-- Schools are K-12 educational institutions

CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    established_year INTEGER,
    board VARCHAR(100), -- CBSE / ICSE / State Board / International
    affiliation VARCHAR(255),
    school_type VARCHAR(50), -- Public / Private / Charter / International
    grade_levels VARCHAR(100), -- e.g., "Pre-K to 12", "1-10", etc.
    state VARCHAR(100),
    city VARCHAR(100),
    zipcode VARCHAR(20),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website_url TEXT,
    principal_name VARCHAR(255),
    principal_email VARCHAR(255),
    principal_phone VARCHAR(50),
    student_strength INTEGER,
    teacher_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE school_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    facility_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (school_id, facility_name)
);

CREATE TABLE school_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE school_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    year INTEGER,
    achievement_type VARCHAR(100), -- Academic / Sports / Cultural / Other
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE school_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year VARCHAR(20),
    grade_level VARCHAR(50), -- 10th / 12th
    pass_percentage NUMERIC(5,2),
    distinction_count INTEGER,
    first_class_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UNIVERSITY PROFILE TABLES
-- Universities are higher education institutions offering multiple programs

CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    established_year INTEGER,
    university_type VARCHAR(100), -- Public / Private / Deemed / Central / State
    accreditation VARCHAR(255), -- NAAC A++ / UGC / etc.
    state VARCHAR(100),
    city VARCHAR(100),
    zipcode VARCHAR(20),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website_url TEXT,
    vice_chancellor_name VARCHAR(255),
    vice_chancellor_email VARCHAR(255),
    vice_chancellor_phone VARCHAR(50),
    total_students INTEGER,
    total_faculty INTEGER,
    campus_area VARCHAR(100), -- e.g., "100 acres"
    referral_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    department_name VARCHAR(255) NOT NULL,
    hod_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    program_level VARCHAR(100), -- Undergraduate / Postgraduate / Doctoral / Diploma
    program_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    duration_years INTEGER,
    annual_fees NUMERIC(12,2),
    total_seats INTEGER,
    eligibility TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    facility_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (university_id, facility_name)
);

CREATE TABLE university_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    academic_year VARCHAR(20),
    placement_percent NUMERIC(5,2),
    average_package NUMERIC(12,2),
    highest_package NUMERIC(12,2),
    companies_visited INTEGER,
    top_recruiters TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    ranking_body VARCHAR(255) NOT NULL, -- NIRF / QS / THE / etc.
    rank_value VARCHAR(100),
    year INTEGER,
    category VARCHAR(255),
    certificate_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    research_title VARCHAR(255) NOT NULL,
    area VARCHAR(255),
    publication_year INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_schools_user_id ON schools(user_id);
CREATE INDEX idx_school_facilities_school_id ON school_facilities(school_id);
CREATE INDEX idx_school_programs_school_id ON school_programs(school_id);
CREATE INDEX idx_school_achievements_school_id ON school_achievements(school_id);
CREATE INDEX idx_school_results_school_id ON school_results(school_id);

CREATE INDEX idx_universities_user_id ON universities(user_id);
CREATE INDEX idx_universities_referral_code ON universities(referral_code);
CREATE INDEX idx_university_departments_university_id ON university_departments(university_id);
CREATE INDEX idx_university_programs_university_id ON university_programs(university_id);
CREATE INDEX idx_university_facilities_university_id ON university_facilities(university_id);
CREATE INDEX idx_university_placements_university_id ON university_placements(university_id);
CREATE INDEX idx_university_rankings_university_id ON university_rankings(university_id);
CREATE INDEX idx_university_research_university_id ON university_research(university_id);

-- Add foreign key for referred_by users if needed
-- ALTER TABLE users ADD COLUMN referred_by_university_id UUID REFERENCES universities(id);
-- CREATE INDEX idx_users_referred_by_university ON users(referred_by_university_id);
