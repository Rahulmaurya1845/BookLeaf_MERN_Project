// BookLeaf Knowledge Base, split into small sections so each AI call only carries
// what it needs (cost-awareness): COMPANY + TONE always, plus ONE category policy.

const COMPANY = `BookLeaf Publishing is a self-publishing company in India and the US. Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package with marketing and distribution add-ons). We handle cover design, typesetting, ISBN assignment, printing, distribution and royalty management. In-house printing facility and warehouse are in Delhi; print partners are Repro India and Epitome Books.`;

const TONE = `TONE GUIDELINES
- Empathetic and professional. Authors are partners, not customers to be managed.
- Acknowledge the author's concern before jumping to solutions.
- Be specific: use actual numbers, dates and statuses instead of vague reassurance.
- If something is BookLeaf's fault (delayed royalty, ISBN error), own it directly. No corporate deflection.
- If escalation or investigation is needed, give a clear timeline (e.g. "Our team will look into this and get back to you within 48 hours").
- Always end with a clear next step for the author and/or the BookLeaf team.`;

const POLICIES = {
  'Royalty & Payments': `ROYALTY POLICY
- 80/20 split: 80% of net profit per book goes to the author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold is Rs 1,000; below that, royalties roll over to the next quarter.
- Payouts are by bank transfer to the account linked in the author's dashboard.
- Authors can see a detailed royalty breakdown (sales per platform) in their dashboard.`,

  'ISBN & Metadata Issues': `ISBN POLICY
- Every book gets a unique ISBN assigned by BookLeaf, registered under BookLeaf's publisher imprint.
- An author who wants an ISBN under their own imprint must obtain it independently.
- ISBN errors (duplicate, wrong book linked) are HIGH PRIORITY and escalated to the production team.
- Metadata updates (e.g. description) can be submitted via the dashboard or by emailing the team; they reflect on platforms within 3-5 business days.`,

  'Printing & Quality': `PRINTING & QUALITY
- In-house printing handles most orders; overflow or special formats go to Repro India or Epitome Books.
- Standard print turnaround is 5-7 business days from order confirmation.
- For quality issues (misprints, binding defects, colour inconsistency) BookLeaf arranges a FREE reprint after verification; the author may need to share photos of the defective copy.`,

  'Distribution & Availability': `DISTRIBUTION
- Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.
- New listings usually go live 7-10 business days after publication is complete.
- A book showing as unavailable on a platform usually means a stock sync issue; BookLeaf can trigger a re-sync, which takes 24-48 hours.`,

  'Book Status & Production Updates': `PRODUCTION STAGES
Manuscript Received -> Editing (if opted) -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
- Authors are emailed at each stage.
- Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds). If the delay is on the author's side, never blame them; frame it collaboratively.`,

  'General Inquiry': `GENERAL
- Metadata updates (e.g. book description on Amazon) can be submitted through the dashboard or by emailing the BookLeaf team; changes reflect on platforms in 3-5 business days.`,
};

// One short calibration example per category (guidance, not text to copy).
const EXAMPLES = {
  'Royalty & Payments': `Author: "Published 4 months ago, no royalty yet." -> Acknowledge frustration, explain quarterly cycle + 45-day window, check bank details are linked, give the specific next payout date; if genuinely overdue, escalate with a 48-hour timeline. Author: "Sold 200 copies, got only Rs 3,000." -> Explain net-profit maths, offer a line-by-line breakdown, be transparent not defensive.`,
  'ISBN & Metadata Issues': `Author: "Amazon shows a different ISBN than my physical copy." -> Treat as high priority, call it a serious data issue, confirm immediate escalation to production, promise resolution within 48 hours.`,
  'Printing & Quality': `Author: "Blurry images, misaligned pages." -> Apologise sincerely, ask for photos of the defective copies, confirm a free reprint once verified, timeline 5-7 business days.`,
  'Distribution & Availability': `Author: "Shows Currently Unavailable on Amazon." -> Explain it is typically a stock sync issue, confirm a re-sync is being triggered with the distribution team, expect 24-48 hours.`,
  'Book Status & Production Updates': `Author: "3 weeks in typesetting, when done?" -> Check the real status, be honest about the reason for delay, give a specific updated timeline, frame collaboratively.`,
  'General Inquiry': `Author: "Can I update my Amazon description?" -> Yes, via dashboard or email; reflects in 3-5 business days.`,
};

module.exports = { COMPANY, TONE, POLICIES, EXAMPLES };
