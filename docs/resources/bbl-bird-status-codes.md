# BBL Bird Status Codes

**Source:** https://www.pwrc.usgs.gov/BBL/Bander_Portal/login/birdstatus.php  
**Retrieved:** 2026-06-12  
**Access:** USGS Bird Banding Laboratory Bander Portal — publicly accessible (no login required for this page)

---

## Overview

The BBL status system has two layers:

1. **Single-digit Status Code** (1 character) — describes the bird's condition/disposition at time of release
2. **Two-digit Additional Information Code** (2 characters, `00`–`99`) — describes markers or procedures applied (color bands, blood samples, transmitters, etc.)

MAPS uses the **three-digit combination** (status + info code). For example:
- `300` = status `3` (normal wild bird) + info `00` (no additional procedure)
- `301` = status `3` + info `01` (color band applied)
- `318` = status `3` + info `18` (blood sample taken)
- `500` = status `5` (sick/injured) + info `00`
- `700` = status `7` (rehabilitated) + info `00`

The MAPS Manual (2025) adds `000` as a special code for unbanded or dead birds.

---

## Single-Digit Status Codes

| Code | Status | Definition |
|---|---|---|
| `–` | Dead bird | Banding or trapping mortality; no band applied |
| `2` | Transported | Moved to a different location; otherwise normal wild bird |
| `3` | Normal wild bird | Released same day/banding block as capture; held ≤24 hours |
| `4` | Hand-reared / hacked | Raised in captivity from egg or nestling |
| `5` | Sick / injured / stressed | Sick, exhausted, over-stressed, injured, or physical deformity |
| `6` | *(Obsolete)* | Experimental birds; no new bandings permitted |
| `7` | Rehabilitated & held | Rehabilitated and held longer than 24 hours |
| `8` | Held >24 hours | Held for experimental or other purposes; otherwise normal |
| `9` | *(Obsolete)* | Dog-caught birds; no records remain in database |

---

## Additional Information Codes (selected)

Two-digit codes `00`–`99`. Most require approval from the appropriate Banding Office. Examples known to appear in MAPS data:

| Info code | Meaning |
|---|---|
| `00` | No additional procedure |
| `01` | Color band applied |
| `18` | Blood sample taken |
| `19` | Color band + blood sample |
| `25` | Radiotag / GPS device applied |

Full table available at the Bander Portal under Reference → Lookup Tables (sign-in required for the complete list).

---

## Relationship to MAPS three-digit codes

| MAPS code | = BBL status | + info | Hallie's label |
|---|---|---|---|
| `300` | 3 (normal) | 00 | Healthy, released w/metal band |
| `301` | 3 (normal) | 01 | Healthy + color band |
| `318` | 3 (normal) | 18 | Healthy + blood sample |
| `319` | 3 (normal) | 19 | Healthy + color band + blood sample |
| `325` | 3 (normal) | 25 | Radiotag/GPS |
| `500` | 5 (injured) | 00 | Injured/stressed/deformed/sick + metal band |
| `700` | 7 (rehabilitated) | 00 | Rehabilitated bird released with metal band |
| `000` | special (MAPS) | — | Unbanded or dead (Hallie uses `---`) |

---

## Notes

- `333`, `334`, `380` appear in Hallie's master sheet but are not in the MAPS 2026 cheat sheet. Under the three-digit scheme: `333` = status 3 + info 33, `334` = status 3 + info 34, `380` = status 3 + info 80. These would be valid BBL procedure codes but are not documented in the MAPS references we have. Verify with Hallie.
- The `–` (dash) single-digit code for dead birds is distinct from the MAPS `000` code, but both refer to banding mortalities with no band applied.
- Status `6` and `9` are obsolete; no new records should use them.

--- 
## Raw cnp page dump of source

``` 
Status and Additional Information Codes
The Status Code is an important part of the Bird Banding Lab database. It is a concise way of describing the condition of a bird and what, if anything was done to a bird before it was released. The codes are a convenient way of choosing which records to use or avoid in analyses of BBL data.

A code of 300 is a normal wild bird that was caught and released in the same day (typically with a Federal leg band). All other codes are presumed to affect either the rate at which re-encountered birds are reported (e.g. neck collars) or potentially to affect survivability (e.g. blood samples).

The Status Code contains three digits. The first digit provides the basic status of the bird and the second and third digits provide additional information.

NOTE 1: It has been decided that two commonly performed activities have minimal to no impact on birds, so do not figure into the determination of status code. These are feather sampling and cloacal swabs.

NOTE 2: The Federal leg band is also not considered in the status and additional information codes. Usually a Federal band is present of course, but occasionally some researchers use only auxiliary markers (with BBL permission).

If in doubt as to which code to use, contact bbl_verify_data@usgs.gov.

Codes for status of the bird
CODE	DESCRIPTION	DEFINITION
-	Dead bird (banding-related mortality).	Dead bird (banding-related mortality).
2	Transported.	Transported to a different 10-minute block, but otherwise normal wild bird (requires an additional permit from Federal Law Enforcement and/or State agencies): may or may not be held for longer than 24 hours. Banding location, age, sex, and date banded must be those at release. Capture location and date must be given in Remarks. Can be used with all additional information codes except 03, 04, 40 and 41.
3	Normal wild bird.	Normal, wild bird: released in same 10-minute block as captured: held 24 hours or less. Can be used with all additional information codes except 40 and 41.
4	Hand-reared, game-farm or hacked bird.	Hand-reared or hacked: raised in captivity from egg or taken as nestling or orphan. Banding location, age, sex, and date banded must be those at release. Hand-rearing may include transporting. If a hand-reared bird is also injured, use additional information code 85. Capture location and date must be given in Remarks. Can be used with all additional information codes except 03, 04, 70, 71, 87 and 88.
5	Sick, Exhausted, Over-stressed, Injured, or Physical Deformity.	Sick, Exhausted, Over-stressed (or shock), Injured (old or new injury), or with a Physical Deformity; held 24 hours or less: may or may not be treated or transported. Requires an explanation in the Remarks. Can be used with all additional information codes except 03, 04, 09 and 10.
6	Obsolete - Experimental bird.	Obsolete. Formerly used with experimental birds that were color-marked (using markers other than leg bands), transported, etc. There are a few records left in the file with status 685 (experimental/miscellaneous). Status 6 may not be used on new bandings.
7	Rehabilitated and held.	Rehabilitated and held longer than 24 hours: sick, exhausted, injured, or crippled: (assumes that transportation and/or blood sampling may be involved). Requires an explanation in "Remarks", including capture location, a short description of the injury and how long it was in captivity (under 250 characters). Rehab birds should NOT be banded before they are ready for release. Banding location, age, sex, and date banded must be those at release. Can be used with all additional information codes except 03, 04, 09, 10, 18, 19, 33, 34, 70 and 71.
8	Held for longer than 24 hours for experimental or other purposes.	Held for longer than 24 hours for experimental or other purposes (including falconry under Federal and State falconry permits) otherwise normal, wild. Status 8 may include transporting, but if held only for transporting use status code 2. Holding for experimentation and transporting both require an additional permit from Fish and Wildlife Service Regional Office and/or State agencies. Age, sex, and banding date must be those at release. Requires an explanation in Remarks, including capture date and location. Can be used with all additional information codes except 03, 04, 40 and 41.
9	Obsolete - Dog caught bird.	Obsolete. Formerly used with dog-caught birds in conjunction with additional information codes 90-99, unless the bird was uninjured, in which case it was permissible to treat it experimentally. There are no records in the file with status 9.
Additional Information Code
EXTRA
INFO
CODE	EXTRA INFO CODE
DESCRIPTION	EXTRA INFO CODE LONG DESCRIPTION
--	Banding or trapping mortality (no band, aux. marker or other info applied).	Banding or trapping mortality (no band, aux. marker or other info applied). Band number assigned by BBL.
00	Federal numbered metal band only.	Federal numbered metal band only.
01	Colored leg band(s): plastic, metal, paint, tape.	Colored leg band(s) of plastic or metal - This applies to painted or anodized Federal bands as well as colored tape over bands. Note: two metal bands should never be used on the same tarsus. Approval from the appropriate Banding Office is needed for use of colored leg bands.
02	Neck collar - usually coded.	Neck collar - Collar codes and colors must be reported in marker-related fields. Approval from the appropriate Banding Office is needed for use of neck collars.
03	Reward band (Federal or State).	Reward band (Federal or State) - Approval from the appropriate Banding Office is needed for reward band use. Use with status code 3 only.
04	Control band (Reward band studies only).	Control band - For use in conjunction with reward band studies only. Use with status code 3 only.
06	Misc. metal band (State, Provincial etc) with address or telephone number, plus Federal band.	Miscellaneous band - Metal bands with an additional address or telephone number, including State or Provincial bands, private organizations bands, and rarely banders. Explanation must be given in the Remarks field. Approval from the appropriate Banding Office is needed to use miscellaneous bands. Field-Readable bands and coded colored leg bands are not included here.
07	Double-banded (Two Federal bands placed on a bird at the same time)	Two Federal bands placed on a bird at the same time. One Federal band on each tarsus -- two metal bands cannot be used on the same tarsus. This code does not apply to a bird to whom a second band was added at a subsequent encounter. Approval from the appropriate Banding Office is needed for double-banding.
08	Temporary markers: Paint or dye; other temporary markers on feathers (imping, tape on tail).	Temporary markers - Any part of bird painted or dyed, or other temporary markers on feathers (e.g., imping, tail streamers, etc.). Approval from the appropriate Banding Office is needed for use of temporary markers on birds.
09	All flight feathers on one or both wings clipped or pulled upon release.	All flight feathers on one or both wings clipped or pulled upon release. Use with status 2, 3, 4 or 8 only.
10	All flight feathers on one or both wings clipped or pulled plus auxiliary marker(s).	All flight feathers on one or both wings clipped or pulled upon release, plus one or more auxiliary markers. All markers must be described in marker-related fields. Use with status 2, 3, 4 or 8 only. Approval from the appropriate Banding Office is needed for auxiliary markers.
11	Sexed by laparotomy or laparoscopy.	Sexed by laparotomy or laparoscopy.
12	Sexed by laparotomy or laparoscopy, plus auxiliary marker(s).	Sexed by laparotomy or laparoscopy, plus one or more auxiliary markers. All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for auxiliary markers.
14	Mouth swab.	Mouth swab.
15	Mouth swab, plus one or more auxiliary markers used.	Mouth swab, plus one or more auxiliary markers used. All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for auxiliary markers.
16	Tracheal swab.	Tracheal swab.
17	Tracheal swab, plus one or more auxiliary markers used.	Tracheal swab, plus one or more auxiliary markers used. All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for auxiliary markers.
18	Blood sample taken.	Blood sample taken (contact the appropriate Bird Banding Office for the required permit). Use with all status codes except 7.
19	Blood sample taken, plus auxiliary marker(s).	Blood sample (contact the appropriate Bird Banding Office for the required permit(s)) plus one or more auxiliary markers used. All markers must be described in marker-related fields. Use with all status codes except 7. Approval from the appropriate Banding Office is needed for use of auxiliary markers.
20	Fostered or cross-fostered into wild nests.	Fostered or cross-fostered into wild nests.
21	Fostered or cross-fostered into wild nests, plus auxiliary marker(s).	Fostered or cross-fostered into wild nests, plus one or more auxiliary markers. All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for use of auxiliary markers.
25	Two or more types of auxiliary markers.	Two or more types of auxiliary markers (e.g., neck collar and color leg band or wing tag and radio transmitter). All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for use of auxiliary markers.
29	Miscellaneous band, Federal band, plus auxiliary marker(s).	Miscellaneous band (see 06), Federal band, plus one or more auxiliary marker. All markers must be described in marker-related fields. Describe miscellaneous band type in Remarks. Approval from the appropriate Banding Office is needed for use of miscellaneous bands and auxiliary markers.
30	Double-banded with Federal bands, plus auxiliary marker(s).	Double banded with TWO Federal bands (see 07), plus one or more auxiliary marker. All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for double banding and the use of auxiliary markers. This code does not apply to a bird to whom a second band was added at a subsequent encounter.
33	Taken from an artificial nest structure (eg, nest boxes, platforms, etc).	Taken from an artificial nest structure (e.g., nest boxes, platforms, etc.). Use with all status codes except 7. Includes hacked birds as code 433.
34	Taken from an artificial nest structure, plus auxiliary marker(s).	Taken from an artificial nest structure, plus one or more auxiliary markers. All markers must be described in marker-related fields. Use with all status codes except 7. Includes hacked birds with auxiliary markers. Approval from the appropriate Banding Office is needed for use of auxiliary markers.
39	Wing, patagial, head, back, and/or nape tag(s).	Wing, patagial, head, back, and/or nape tag(s). All markers must be described in marker-related fields. Approval from the appropriate Banding Office is needed for use of patagial markers.
40	Oiled.	Oiled. Use with status codes 4, 5 and 7 only.
41	Oiled, plus one or more auxiliary markers used.	Oiled. Plus one or more auxiliary markers used. All markers must be described in marker-related fields. Use with status codes 4, 5 and 7 only. Approval from the appropriate Banding Office is needed for use of auxiliary markers.
51	Nasal saddle and nasal discs or other bill marker.	Nasal saddle and nasal discs or other bill marker - Marker must be described in marker-related fields and in Remarks if necessary. Approval from the appropriate Banding Office is needed for use of nasal saddles and nasal discs.
59	Web tagged, usually coded.	Web tagged - Marker must be described in marker-related fields. Approval from the appropriate Banding Office is needed for use of web tags.
69	Flag, streamer, or tab on leg.	Flag, streamer, or tab on leg - Marker must be described in marker-related fields. Approval from the appropriate Banding Office is needed for use of leg markers.
70	Captured by spotlighting.	Spotlighted. Use with status codes 2, 3, 5 and 8 only.
71	Captured by spotlighting, plus auxiliary marker(s).	Spotlighted, plus one or more auxiliary markers used. All markers must be described in marker-related fields. Use with status codes 2, 3, 5 and 8 only. Approval from the appropriate Banding Office is needed for use of auxiliary markers.
75	PIT tag	Equipped with PIT tag only (see also additional information code 25) - Marker must be described in marker-related fields. Frequency and type of attachment may be listed in Remarks. Approval from the appropriate Banding Office is needed for use of PIT tags.
80	Satellite/Cell/GPS transmitter	Equipped with Satellite/Cell/GPS transmitter only (see also additional information code 25) - Marker must be described in marker-related fields. Frequency and type of attachment may be listed in Remarks. Approval from the appropriate Banding Office is needed for use of Satellite/Cell/GPS transmitters.
81	Radio transmitter.	Equipped with radio transmitter only (see also additional information code 25) - Marker must be described in marker-related fields. Frequency and type of attachment may be listed in Remarks. Approval from the appropriate Banding Office is needed for use of radio transmitters.
85	Miscellaneous (combination or situation not covered by other ai codes).	Miscellaneous (combination or situation not covered by other additional information codes) - An explanation is needed in Remarks. For example, a bird that was color-banded, sexed by laparotomy, and blood-sampled would be 385 with an explanation 385 = C/B, laparotomy, blood sample. All markers must be described in marker-related fields. Approval from the appropriate Banding Office may be needed.
87	Captured with drugs or tranquilizers.	Captured by means of drugs or tranquilizers. Use with all status codes except 4.
88	Captured with drugs or tranquilizers, plus auxiliary marker(s).	Captured by means of drugs or tranquilizers, plus one or more auxiliary markers. All markers must be described in marker-related fields. Use with all status codes except 4.
89	Transmitter. (Obsolete, see 80, 81)	Equipped with transmitter only (see also additional information code 25) - Marker must be described in marker-related fields. Frequency and type of attachment may be listed in Remarks. Approval from the appropriate Banding Office is needed for use of radio transmitters.
90	Data logger (including geolocators)	Equipped with data logger only (see also additional information code 25) - Marker must be described in marker-related fields. Frequency and type of attachment may be listed in Remarks. Approval from the appropriate Banding Office is needed for use of data loggers.
99	(none).	(none)
```
