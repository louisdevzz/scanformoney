# Telegram Bounty Scanner Bot

## Overview
Telegram bot that scans and notifies about bounty/hackathon opportunities from multiple sources.

## Data Sources
- Superteam
- DoraHacks
- Devpost
- GitHub
- Galxe
- RSS feeds
- Direct API scraping

## Data Normalization
Each bounty/hackathon item should include:
- Title
- Reward (USD)
- Deadline
- Link
- Tags (dev, design, content, global, etc.)
- Source platform

## Scanning Schedule
- Run every 5-15 minutes
- Compare with previous data
- Only send new or updated projects

## Filtering Criteria
- Reward > $1,000 USD
- Deadline > 3 days remaining
- Category: dev
- Target: global
- Optional keywords: Solana, AI, hackathon, bounty

## Telegram Format
Beautifully formatted messages with:
- Clear title
- Reward amount
- Deadline
- Direct link
