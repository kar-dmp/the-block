<p align="center">
  <img src="docs/the_block_repo.png" alt="The Block challenge hero image" width="960" />
</p>

# The Block

### A coding challenge from OPENLANE

---

OPENLANE powers one of the world's largest digital marketplaces for used vehicles. Every day, thousands of vehicles move through our platform - inspected, listed, auctioned, and sold. Your job is to interpret what we do and bring a working prototype to life.

We're hiring for a team that builds fast, thinks independently, and takes ownership. This challenge is part of that process.

## The Challenge

Build the **buyer side of a vehicle auction platform as a web or mobile application**. We've included a dataset of 200 vehicles in [`data/vehicles.json`](data/vehicles.json), each listed by a selling dealership.

A buyer should be able to browse inventory, inspect vehicle details, and place bids. That's the core experience. How you structure the product and how far you take it is up to you.

## Core Requirements

- Browse and search the vehicle inventory
- Vehicle detail views with specs, condition, damage notes, selling dealership, and photos
- A bidding experience where a buyer can place bids on vehicles
- A usable experience that works well on the platform you choose
- Clear instructions in your README for how to run the project locally

## Assumptions You Can Make

- This is a prototype, not a production launch.
- Target roughly **4-8 hours** of work. If you spend more, that's your call, but we do not expect a fully built marketplace.
- Use any framework, language, or stack.
- If you want stack examples that fit this challenge, React + Vite is a good web option, and SwiftUI for iOS or Compose for Android are reasonable native mobile examples. None of these are required.
- You may use AI tools and coding assistants, and their use is encouraged. Be ready to explain how you used them, what decisions you made, and what parts of the implementation you would refine.
- Authentication and user accounts are **not required**.
- A frontend-only implementation is completely acceptable.
- You do **not** need to build seller workflows, checkout, payments, or dealer admin tooling.
- Auction timestamps in the dataset are synthetic scheduling data. If you want to show countdowns or "live" states, it's fine to normalize them relative to "now" in your prototype.
- Make reasonable product decisions, document your assumptions, and optimize for clarity over surface area.

## Minimum Bar

At a minimum, we want to see:

- Inventory browsing and search
- A clear vehicle detail experience
- A bid flow with updated visible state
- A usable experience on desktop and mobile
- A repo we can clone and run by following your README

## Stretch Ideas

These are optional. Only do them if the basics are solid.

- We care more about judgment than about any specific extra feature.
- If you go beyond the basics, focus on improvements that make the buyer experience clearer, more useful, or more trustworthy.
- That could show up in product decisions, UX details, implementation quality, or any other thoughtful extension that fits the timebox.

## What to Submit

1. **Fork this repo** to your own GitHub account
2. Complete the challenge work in your fork
3. Include a **README** in your repo with setup instructions and notable decisions
4. When you're finished, share the link to your repo with your contact at **OPENLANE**

We've included a [submission template](SUBMISSION.md) if you want a starting point.

We should be able to clone your repo and have it running locally by following your README.

## Timeline

You have **5 days** from when you receive this challenge to submit it.

This is not a speed run. We care more about your decisions and tradeoffs than the total number of features.

## What Happens Next

After you submit, we'll schedule a **45-60 minute walkthrough** where you'll screen-share and walk us through what you built. More details are in [`WALKTHROUGH.md`](WALKTHROUGH.md).

## How We Evaluate

We're not checking boxes. Here's what we care about:

| | What we're looking at |
|---|---|
| **Product thinking** | Did you make smart decisions about what to build and how it should work? Does the UX make sense? |
| **Craft** | Does it look and feel intentional? The details matter - design, layout quality, polish. |
| **Technical quality** | Is the code clean, well-structured, and easy to follow? |
| **Judgment** | Did you scope the work well for the time budget and make sensible tradeoffs? |
| **Workflow** | Can you walk us through how you built it and why? (assessed in the walkthrough) |

## The Data

The vehicle dataset is at [`data/vehicles.json`](data/vehicles.json). Each vehicle includes:

- Lot number, VIN, make, model, year, and trim
- Specs (engine, transmission, drivetrain, fuel type, odometer)
- Condition (grade, report, damage notes, title status)
- Auction details (starting bid, reserve price, buy now price, auction start time)
- Current bid and bid count (some vehicles already have active bids)
- Location (city and province)
- Selling dealership
- Placeholder image URLs

Here's what a single vehicle looks like:

```json
{
  "id": "3cc3b89e-68b0-479e-af39-bca6251ea0b4",
  "vin": "TRD7L1KS0HNB5X3K3",
  "year": 2023,
  "make": "Ford",
  "model": "Bronco",
  "trim": "Big Bend",
  "body_style": "SUV",
  "exterior_color": "Burgundy",
  "interior_color": "Beige",
  "engine": "2.7L EcoBoost V6",
  "transmission": "automatic",
  "drivetrain": "4WD",
  "odometer_km": 47731,
  "fuel_type": "gasoline",
  "condition_grade": 3.8,
  "condition_report": "Average condition. Has some visible wear on high-touch surfaces. Engine and transmission perform within normal parameters.",
  "damage_notes": [
    "Scratch on liftgate",
    "Minor rust on wheel wells",
    "Paint peeling on roof rack"
  ],
  "title_status": "clean",
  "province": "Ontario",
  "city": "Toronto",
  "auction_start": "2026-04-05T14:00:00",
  "starting_bid": 14500,
  "reserve_price": 25000,
  "buy_now_price": null,
  "images": ["https://placehold.co/800x600?text=2023+Ford+Bronco+Photo+1", "..."],
  "selling_dealership": "King City Auto",
  "lot": "A-0043",
  "current_bid": 22800,
  "bid_count": 16
}
```

The data is synthetic but meant to feel realistic. Use it however you want.
