# Trip Expense Splitter

A modern web application for splitting trip expenses fairly between families and their members.

## Features

- **Simple Family Management**: Add families with just a name and member count
- **Easy Activity Tracking**: Record activities with costs, who paid, and participant count
- **Automatic Calculations**: See how much each family owes or gets back
- **Real-time Updates**: Results update automatically as you add/remove data
- **Modern UI**: Beautiful, responsive design with intuitive interface

## How It Works

1. **Add Families**: Enter family names and the number of members in each family
2. **Add Activities**: For each activity, specify:
   - Activity name and cost
   - Which family paid for it
   - How many people participated
3. **View Results**: The app automatically calculates:
   - How much each family paid
   - How much each family owes (based on proportional participation)
   - Net amount each family should receive or pay

## Example Scenario

Four families go on a trip:

- **Smith Family** (3 members)
- **Johnson Family** (2 members)
- **Brown Family** (3 members)
- **Wilson Family** (2 members)

Activities:

1. **Dinner** ($200) - Paid by Smith Family, 10 people participated
2. **Movie** ($80) - Paid by Johnson Family, 6 people participated
3. **Gas** ($60) - Paid by Brown Family, 10 people participated

The app will calculate proportional participation and show the final settlement amounts.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Lucide React** for beautiful icons
- **Modern CSS** with responsive design

## Usage Tips

- **Family Names**: Use descriptive names like "Smith Family" or "The Johnsons"
- **Member Counts**: Simply enter the number of people in each family
- **Activity Costs**: Include all costs (tax, tip, etc.) in the total
- **Participant Counts**: Enter how many people actually participated in each activity
- **Fair Splitting**: The app assumes proportional participation based on family sizes

## How Calculations Work

The app uses a proportional participation model:

- For each activity, it calculates what percentage of total members each family represents
- It then applies that percentage to the activity's participant count
- Costs are split equally among all participants
- Each family's share is calculated based on their proportional participation

This approach is fair and simple, making it perfect for most group trip scenarios.

## License

This project is open source and available under the MIT License.
