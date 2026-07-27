# Open questions — parked until after the PoC

One place for everything still undecided or unverified. The app can be built without these;
each answer just upgrades data quality or settles a UI choice. Details live in
[rarau-review.md](rarau-review.md).

## A. Access & transport (highest value — gates itinerary feasibility)

- [ ] Is there any **bus service to Chiril, Rusca, Zugreni, Slătioara, Gemenea**? Which line, how often? (Decides whether the southern/western trailheads count as reachable without a car.)
- [ ] Confirm current CFR stops at **Câmpulung Est** and **halta Valea Putnei** (Mersul Trenurilor).
- [ ] Measure the town-walk links: gara Câmpulung → str. Sirenei (`s48`), gara Câmpulung Est → capătul Văii Seci (`s49`), centrul Slătioarei → confluența Ursului/Ion (`s50`). (`s51` Chiril → km 2,8 is sourced.)
- [ ] Is there trailhead signage at the four derived trailheads? (Sirenei, Valea Seacă, Slătioara confluence, Chiril km 2,8.)

## B. Times & policy

- [ ] Spot-check 2–3 computed descent times on the ground (e.g. hotel→Câmpulung on 16MN14, computed 5:20; hotel→CM Est on 16MN17, computed 4:00).
- [ ] Confirm the display policy: published time shown to users, computed segment times used for math, comfort factor ×1.25–1.5 applied at generation only.
- [ ] Cabana Giumalău: meals or no meals? (16MN05/06 say no; 16MN04 page ambiguous. Changes 2-day packing advice.)

## C. Field/geometry checks (all flagged in the JSON `issues`)

- [ ] Where exactly is **Punctul Salvamont Rarău**? (Current coords collapse `s42` to 20 m — almost certainly wrong.)
- [ ] Does the toponym **Poiana Ciungilor** sit at the derived 03×04 junction (47.4285, 25.4690)?
- [ ] **Muntele Todirescu**: confirm the 24×BR junction point and source an elevation (1487 currently unsourced).
- [ ] **16MN03's NW end** is ~6 km SE of the actual Pasul Mestecăniș despite the name — where does the marked trail really begin?
- [ ] The two same-named saddles (Șaua Ciobanilor / Șaua Poiana Șoimului duplicates) — worth reporting upstream to OSM once confirmed.

## D. Data gaps

- [ ] Re-extract **16MN16** from its muntii-nostri page (facts currently from search snippets; ascent/descent/max-ele missing).
- [ ] Official reserve rules for Codrul Secular Slătioara / Pietrele Doamnei / Moara Dracului (entry fees? seasonal closures?).
- [ ] Piatra Zimbrului elevation (OSM 1444 looks low); Cabana Pastorală operating status.
- [ ] Lodging inventory beyond Hotel Rarău + Cabana Giumalău (pensiuni in Chiril/Slătioara/Pojorâta) for 2-day margareta trips.

## E. UI / product verdicts (from the design session, still open)

- [ ] Launch with all 4 trip types (Plimbare / Drumeție de zi / Weekend margaretă / Weekend stea) or start with 2?
- [ ] Text labels next to blaze plates for novices, or plates alone?
- [ ] Show "în validare" trails publicly (recruits validators) or hide until validated?
- [ ] Milestone timeline: cumulative times, per-segment times, or both?
- [ ] Kitsch check: dated validation stamp + hand-sketch elevation profile — in or out?
- [ ] Badger-with-beer logo vs. safety messaging tone — keep, soften, or move the beer to the "after the hike" section?
