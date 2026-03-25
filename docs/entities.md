# BirdNerd Entities

> **Note:** The diagrams below are easier to read in light mode (not dark mode).

## Color Coding Conventions

The ER diagram uses colors to categorize entity types:

- **Pink** — General BirdNerd operational entities (core business objects)
  - Organization, Person, User, Bander, Location, Net, Band, BandingRecord
- **Orange** — Session-related data (tracking one banding session and its participants/efforts)
  - Session (includes flattened weather readings), SessionNetLog, SessionBanderLog
  - *Note: May be split into separate schema in future phases for multi-tenant data isolation*
- **Green** — Reference data from canonical external sources (imported, read-mostly)
  - Species (from USGS BBL master list)
  - CodeTable (from USGS BBL LOOKUPS sheet)
  - Note: Right now I'm thinking of designing this NOT as database tables (so no db-level FK), but static resources with some decoupling from application code (e.g. resource files). For db codes, we'll just need to specify text length limits. Indeed, BandingRecord itself is a good candidate for schematized document store record where such codes would be part of their schema. This would allow for banding records from different protocols to use the same infrastructure.
- **White** — Immutable audit/change log data (append-only, no updates or deletes)
  - ChangeLog (complete record of all entity changes)

```mermaid
erDiagram
    Organization {
        string id
        string name
        datetime created
        datetime updated
    }

    Person {
        string id
        string name
        string initials
        datetime created
        datetime updated
    }

    User {
        string id
        string person_id
        string email
        string display_name
        datetime created
        datetime updated
    }

    Bander {
        string id
        string person_id
        string organization_id
        datetime created
        datetime updated
    }

    Location {
        string id
        string bander_location_id
        string bbl_location_id
        string name
        number latitude
        number longitude
        string country
        string state_province
        string remarks
        datetime created
        datetime updated
    }

    Session {
        string id
        string location_id
        date session_date
        string protocol
        string maps_period
        string master_bander_id
        datetime open_time
        datetime close_time
        number open_temp
        number open_wind
        number open_cloud_cover
        string open_precipitation
        number close_temp
        number close_wind
        number close_cloud_cover
        string close_precipitation
        string notes
        datetime created
        datetime updated
    }

    Net {
        string id
        string location_id
        string label
        boolean active
        datetime created
        datetime updated
    }

    SessionNetLog {
        string id
        string session_id
        string net_id
        string remarks
        datetime created
        datetime updated
    }

    SessionBanderLog {
        string id
        string session_id
        string bander_id
        datetime created
        datetime updated
    }

    Species {
        string id
        string alpha_code
        string species_name
        string sci_name
        string french_name
        string spanish_name
        datetime created
        datetime updated
    }

    BandingRecord {
        string id
        string session_id
        string band_id
        string band_number
        string species_code
        string capture_code
        string age
        string how_aged
        string how_aged2
        string wrp
        string sex
        string how_sexed
        string how_sexed2
        string skull
        string brood_patch
        string cloacal_protuberance
        string fat
        string body_molt
        string ff_molt
        string ff_wear
        string juv_body_plumage
        string p_covs
        string s_covs
        string pp
        string ss
        string tert
        string rec
        string body_plum
        string non_feather
        number wing
        number tail
        number tarsus
        number exposed_culmen
        number other_measurement
        number body_mass
        string status
        string disposition
        string bander_id
        string capture_time
        string release_time
        string net_id
        string notes
        boolean feather_pull
        boolean blood_sample
        datetime created
        datetime updated
    }

    Band {
        string id
        string band_number
        string status
        string band_size
        string band_type
        string current_species
        string deployment_date
        datetime created
        datetime updated
    }

    CodeTable {
        string id
        string code_type
        string code
        string description
        datetime created
        datetime updated
    }

    ChangeLog {
        string id
        datetime created
        string person_id
        string change_type
        string entity
        json detail
    }

    Organization ||--o{ Location : owns
    Organization ||--o{ Bander : includes
    Person ||--o{ Bander : assigned
    Person ||--o{ User : has
    Person ||--o{ ChangeLog : makes

    Location ||--o{ Net : includes
    Location ||--o{ Session : hosts
    Session ||--o{ SessionNetLog : includes
    Session ||--o{ SessionBanderLog : includes
    Session ||--o{ BandingRecord : contains

    Net ||--o{ SessionNetLog : logs

    Bander ||--o{ SessionBanderLog : assigned

    Bander ||..o{ Session : leads
    Bander ||..o{ BandingRecord : recorded_by

    Species }o..o{ BandingRecord : "code lookup (no FK)"
    Band ||--o{ BandingRecord : assigned

    CodeTable }o..o{ BandingRecord : "code lookup (no FK)"

    classDef entitySpec fill:#ffd1dc,stroke:#333,stroke-width:1px,color:#000
    classDef sessionData fill:#ffe4b5,stroke:#ff8c00,stroke-width:1px,color:#000
    classDef referenceData fill:#b7e4c7,stroke:#2f6f3e,stroke-width:1px,color:#000
    classDef immutable fill:#ffffff,stroke:#666,stroke-width:2px,color:#000
    
    class Organization,Person,User,Bander,Location,Net,Band,BandingRecord entitySpec
    class Session,SessionNetLog,SessionBanderLog sessionData
    class Species,CodeTable referenceData
    class ChangeLog immutable
```

---

## Data Flow Diagram

```mermaid
graph LR
    subgraph Onboard["🔧 Onboarding & Management"]
        A1["Location & Nets<br/>Setup geographic<br/>and equipment"]
        A2["Band Inventory<br/>Import/manage<br/>band stock"]
        A3["Reference Data<br/>Species, CodeTable<br/>auto-import"]
    end

    subgraph Entry["📝 Data Entry"]
        A4["Banding Data Form<br/>BandingRecord<br/>in the field"]
        A5["Session Setup<br/>Session metadata<br/>Weather, effort"]
        A6["CSV Import<br/>Legacy data<br/>migration"]
    end

    subgraph Model["🗄️ BirdNerd Database"]
        B[("BirdNerd<br/>13 entities<br/>+ ChangeLog<br/>IndexedDB ↔ Supabase")]
    end

    subgraph Upload["📤 Agency Uploads"]
        C1["BBL Format<br/>58 columns<br/>USGS submission"]
        C2["IBP / CDFW<br/>Code translation<br/>Agency-specific"]
    end

    subgraph Views["📊 BirdNerd Views"]
        C3["CSV Export<br/>Standard format<br/>all records"]
        C4["Session Reports<br/>Effort summary<br/>Record counts"]
        C5["Band History<br/>Encounter timeline<br/>Recaptures"]
    end

    subgraph Analysis["🔬 Analysis Database"]
        C6[("Analysis DB<br/>Validation checks<br/>Derived stats")]
    end

    A1 --> B
    A2 --> B
    A3 --> B
    A4 --> B
    A5 --> B
    A6 --> B

    B --> C1
    B --> C2
    B --> C3
    B --> C4
    B --> C5
    B --> C6

    classDef onboardBox fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef entryBox fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef modelBox fill:#ffd1dc,stroke:#c2185b,stroke-width:3px,color:#000
    classDef uploadBox fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef viewBox fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef analysisBox fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#000
    
    class A1,A2,A3 onboardBox
    class A4,A5,A6 entryBox
    class B modelBox
    class C1,C2 uploadBox
    class C3,C4,C5 viewBox
    class C6 analysisBox
```
