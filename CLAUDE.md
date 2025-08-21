# GitHub Account Switcher - AI Assistant Guide

## Project Overview

GitHub Account Switcher is a browser extension (Chrome/Firefox/Edge) that enables users to seamlessly switch between multiple GitHub accounts without logging out. The extension provides a convenient dropdown interface and automatic account switching based on configured rules.

### Key Features

- Quick account switching via browser extension popup
- Automatic account switching based on URL patterns/rules
- Account management (add/remove accounts)
- Works with both GitHub.com and GitHub Enterprise
- Cross-browser compatibility (Chrome, Firefox, Edge)

## Architecture

### Technology Stack

- **Frontend Framework**: React 18.3.1 with TypeScript 5.7.2
- **UI Library**: Material-UI (MUI) v5
- **Build Tool**: Vite 6.0.7
- **Extension Framework**: @crxjs/vite-plugin 2.2.0
- **Browser API**: webextension-polyfill 0.12.0
- **Styling**: Emotion + MUI components

### Project Structure

```
src/
├── background/           # Service worker for extension
│   └── index.ts
├── content/             # Content scripts injected into GitHub pages
│   ├── index.ts         # Main content script
│   ├── index.css        # Content script styles
│   ├── injected.ts      # Script injected into main page context
│   ├── createElement.ts # DOM manipulation utilities
│   └── ui.ts           # UI component creation
├── popup/              # Extension popup interface
│   ├── Popup.tsx       # Main popup component
│   ├── index.tsx       # Popup entry point
│   └── components/     # Popup UI components
│       ├── Accounts.tsx      # Account list management
│       ├── AutoSwitchRules.tsx # Rule configuration
│       ├── Header.tsx        # Popup header
│       ├── RuleItem.tsx      # Individual rule component
│       └── Settings.tsx      # Settings panel
├── services/           # Business logic services
│   ├── account.ts      # Account management
│   ├── badge.ts        # Extension badge updates
│   ├── cookie.ts       # Cookie manipulation
│   ├── rule.ts         # Auto-switch rules
│   └── storage.ts      # Chrome storage API wrapper
├── assets/             # Static assets
├── shared.ts           # Shared utilities
├── types.ts            # TypeScript type definitions
└── global.d.ts         # Global type declarations

public/
├── icons/              # Extension icons
└── img/                # Image assets

scripts/
└── build.ts            # Post-build script for Firefox compatibility
```

## Development Workflow

### Prerequisites

- Node.js >=18.0.0
- npm or pnpm package manager

### Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production (creates dist/ folder)
npm run build

# Format code
npm run fmt

# Preview production build
npm run preview
```

### Build Output

- **`dist/`**: Chrome extension build
- **`dist_firefox/`**: Firefox extension build (auto-generated)
- **`release/`**: Packaged extension files (.zip)

### Development Server

The `npm run dev` command starts Vite dev server with:

- Hot module replacement for popup components
- Auto-reload for content scripts and background scripts
- TypeScript compilation and error checking

## Extension Components

### 1. Background Script (`src/background/index.ts`)

- **Purpose**: Service worker handling extension lifecycle
- **Responsibilities**:
  - Account switching logic
  - Cookie management across domains
  - Auto-switch rule processing
  - Badge updates
  - Message passing between components

### 2. Content Scripts (`src/content/`)

- **Purpose**: Injected into GitHub pages to add UI elements
- **Key Files**:
  - `index.ts`: Main content script, adds account switcher to GitHub UI
  - `injected.ts`: Runs in page context to patch fetch/requests
  - `ui.ts`: Creates DOM elements for account switching interface

### 3. Popup Interface (`src/popup/`)

- **Purpose**: Extension popup accessible via browser toolbar
- **Components**:
  - Account list with add/remove functionality
  - Auto-switch rules configuration
  - Settings panel
  - Current account display

## Key Technical Details

### Cookie Management

The extension manipulates GitHub cookies to switch accounts:

- Stores multiple account sessions
- Switches between stored cookie sets
- Handles both GitHub.com and GitHub Enterprise domains

### Auto-Switch Rules

Users can configure rules to automatically switch accounts based on:

- URL patterns (regex support)
- Repository ownership
- Organization membership

### Cross-Browser Compatibility

- Uses webextension-polyfill for API normalization
- Manifest v3 for Chrome, auto-converts to v2 for Firefox
- Build script handles browser-specific differences

## Testing & Quality Assurance

### Manual Testing Checklist

1. **Account Management**:
   - [ ] Add new account via popup
   - [ ] Remove existing account
   - [ ] Switch between accounts
   - [ ] Verify current account display

2. **Auto-Switch Rules**:
   - [ ] Create URL-based rule
   - [ ] Test rule triggering
   - [ ] Edit/delete rules
   - [ ] Rule priority handling

3. **Cross-Browser**:
   - [ ] Chrome extension loading
   - [ ] Firefox extension loading
   - [ ] Edge compatibility

### Common Issues & Solutions

#### Build Issues

- **Vite build failures**: Check TypeScript errors, ensure all imports are resolved
- **Extension loading errors**: Verify manifest.json, check permissions
- **Resource loading errors**: Ensure web_accessible_resources are properly listed

#### Runtime Issues

- **Cookie switching failures**: Check domain permissions, verify GitHub session structure
- **Content script injection**: Ensure matches patterns are correct
- **Auto-switch not working**: Debug rule matching logic, check URL patterns

## Development Guidelines

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **React**: Functional components with hooks
- **Styling**: MUI components + Emotion for custom styles
- **Formatting**: Prettier with consistent configuration

### Commit Guidelines

- Use conventional commits format
- Include scope when applicable (e.g., `feat(popup):`, `fix(content):`)
- Update version in package.json for releases

### Performance Considerations

- Keep content script bundle size minimal
- Use dynamic imports where possible
- Optimize popup loading time
- Cache frequently accessed data in Chrome storage

## API Integration

### Chrome Extension APIs Used

- `chrome.storage`: User preferences and account data
- `chrome.cookies`: Account session management
- `chrome.webRequest`: Request interception for auto-switching
- `chrome.declarativeNetRequest`: Modern request handling
- `chrome.action`: Popup and badge management

### GitHub Integration

- No official GitHub API usage (works with web interface)
- Relies on GitHub's cookie-based authentication
- Supports both GitHub.com and GitHub Enterprise instances

## Security Considerations

### Permissions

- `cookies`: Required for account switching
- `storage`: User preferences and account data
- `webRequest`/`declarativeNetRequest`: URL pattern matching
- `host_permissions`: Limited to `https://*.github.com/`

### Data Privacy

- All data stored locally in browser
- No external data transmission
- Cookie data handled securely
- User account information never exposed

## Deployment & Distribution

### Chrome Web Store

1. Build production version: `npm run build`
2. Test extension thoroughly
3. Package `dist/` folder
4. Upload to Chrome Web Store dashboard
5. Update store listing with changelog

### Firefox Add-ons

1. Build process auto-generates Firefox version
2. Package `dist_firefox/` folder
3. Submit to Firefox Add-ons site
4. Handle review process

### Manual Installation (Development)

1. Build extension: `npm run build`
2. Open `chrome://extensions/` (Chrome) or `about:debugging` (Firefox)
3. Enable Developer Mode
4. Load unpacked extension from `dist/` folder

## Troubleshooting Guide

### Development Issues

- **TypeScript errors**: Check tsconfig.json, update type definitions
- **Build failures**: Clear node_modules, reinstall dependencies
- **Hot reload not working**: Restart dev server, check file watchers

### Extension Issues

- **Not loading**: Check manifest.json syntax, verify permissions
- **Content script not injecting**: Verify URL matches patterns
- **Popup not opening**: Check popup.html path, verify React build

### User Issues

- **Account switching not working**: Clear browser cookies, re-add accounts
- **Auto-switch rules not triggering**: Check rule patterns, verify URL matching
- **Extension disappeared**: Check if disabled, reinstall if necessary

## Future Development Ideas

### Potential Features

- **Team Management**: Organize accounts by teams/organizations
- **Advanced Rules**: Time-based switching, context-aware rules
- **Backup/Sync**: Cloud sync of accounts and rules
- **Analytics**: Usage tracking and insights
- **Enterprise Features**: SSO integration, admin controls

### Technical Improvements

- **Performance**: Optimize bundle size, lazy loading
- **Testing**: Add automated test suite
- **Documentation**: Interactive user guide
- **Accessibility**: Improve keyboard navigation, screen reader support

## Resources & References

### Documentation

- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Vite Documentation](https://vitejs.dev/)
- [MUI Documentation](https://mui.com/)

### Tools & Libraries

- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run fmt              # Format code

# Extension Loading
chrome://extensions/     # Chrome extension management
about:debugging         # Firefox extension management

# Testing
# Manual testing required - no automated tests currently

# Debugging
# Use browser developer tools
# Check extension service worker console
# Monitor network requests in content script context
```

## Contact & Support

- **Repository**: GitHub repository URL
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for feature requests
- **Author**: Kevin Yue <yuezk001@gmail.com>
