# Hostel Visitor Management System

A modern, responsive visitor management system prototype for hostel administration. This system allows visitors to sign in and sign out, while providing administrators with a comprehensive dashboard to manage and monitor visitor activity.

## Features

### Visitor Features
- **Sign In**: Complete registration form with photo capture/upload
- **Sign Out**: QR code scanning or search-based sign out
- **User-friendly Interface**: Clean, modern design with intuitive navigation

### Admin Features
- **Dashboard**: Real-time statistics and visitor overview
- **Recent Visitors**: Quick view of current and recent visitors
- **Quick Actions**: Export reports, view pending sign-outs, and generate summaries
- **Navigation**: Easy access to Visitors, Reports, and Settings sections

## Technology Stack

- **React 18** - UI framework
- **React Router** - Client-side routing
- **Vite** - Build tool and development server
- **CSS3** - Styling with modern design patterns

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx       # Home page with Sign In/Out options
│   │   ├── SignInPage.jsx         # Visitor registration form
│   │   ├── SignOutPage.jsx        # Visitor sign out interface
│   │   └── AdminDashboard.jsx    # Admin control panel
│   ├── App.jsx                    # Main app component with routing
│   ├── main.jsx                   # Application entry point
│   └── index.css                  # Global styles
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
└── vite.config.js                 # Vite configuration
```

## Pages

1. **Landing Page** (`/`) - Main entry point with navigation options
2. **Sign In** (`/sign-in`) - Visitor registration form
3. **Sign Out** (`/sign-out`) - Visitor checkout interface
4. **Admin Dashboard** (`/admin`) - Administrative control panel

## Demo Notes

This is a prototype/demo version. The following features are simulated:
- Photo upload/capture (UI ready, backend integration needed)
- QR code scanning (UI ready, camera integration needed)
- Form submission (alerts shown, backend integration needed)
- Search functionality (mock data, database integration needed)

## Future Enhancements

- Backend API integration
- Database connectivity
- Real-time photo capture using device camera
- QR code generation and scanning
- User authentication
- Email notifications
- Advanced reporting and analytics

## License

©onlyjuliuss

