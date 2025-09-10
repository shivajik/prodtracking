# Green Gold Seeds Product Tracking System

## Overview

This is a full-stack product tracking system for Green Gold Seeds, designed to manage product submissions, approvals, and public tracking. The system allows operators to submit product information for approval, administrators to review and approve/reject submissions, and the public to track approved products using unique product IDs.

The application implements a two-tier user system (operators and administrators) with secure authentication, file upload capabilities for product brochures, and a public-facing product tracking interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built as a Single Page Application (SPA) using React with TypeScript. The architecture follows a component-based design with:

- **React Router**: Uses Wouter for lightweight client-side routing
- **UI Components**: Leverages shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with a custom design system using CSS variables for theming
- **Build Tool**: Vite for fast development and optimized production builds

The frontend implements role-based routing with protected routes that redirect unauthenticated users to the login page and role-specific dashboards for operators and administrators.

### Backend Architecture
The server follows a REST API pattern built with Express.js and TypeScript:

- **Authentication**: Passport.js with local strategy for username/password authentication
- **Session Management**: Express sessions with PostgreSQL session store for persistence
- **File Upload**: Multer middleware for handling product brochure uploads with file type validation
- **API Design**: RESTful endpoints for authentication, product management, and public tracking
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes

### Data Storage Solutions
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations:

- **Database Driver**: Neon serverless PostgreSQL with WebSocket support
- **Schema Management**: Drizzle migrations with schema definition in TypeScript
- **Data Models**: Two main entities - Users (with role-based access) and Products (with approval workflow)
- **Session Storage**: PostgreSQL-backed session store for authentication persistence

The database schema supports a complete product approval workflow with timestamps, status tracking, and user relationships.

### Authentication and Authorization
The system implements a multi-layered security approach:

- **Password Security**: Scrypt-based password hashing with salt for secure storage
- **Session Management**: Server-side sessions with secure cookies and PostgreSQL backing
- **Role-Based Access**: Two-tier system (operator/admin) with route-level protection
- **API Security**: Authentication middleware protecting sensitive endpoints
- **CSRF Protection**: Built-in Express session protection

### File Management
Product brochures are handled through a secure file upload system:

- **Upload Validation**: File type restrictions (PDF, DOC, DOCX, JPG, JPEG, PNG)
- **Size Limits**: 10MB maximum file size to prevent abuse
- **Storage**: Local file system storage with unique filename generation
- **Access Control**: File serving through controlled endpoints

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript, React Hook Form for form management
- **TanStack Query**: Server state management and caching
- **Express.js**: Node.js web framework for API development
- **Wouter**: Lightweight React router alternative

### Database and ORM
- **Drizzle ORM**: Type-safe PostgreSQL ORM with migration support
- **Supabase PostgreSQL**: Production database hosted on Supabase with transaction pooler
- **Drizzle Kit**: CLI tool for schema management and migrations

### UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography

### Authentication and Security
- **Passport.js**: Authentication middleware with local strategy
- **Express Session**: Session management with PostgreSQL store
- **connect-pg-simple**: PostgreSQL session store for Express
- **Crypto**: Node.js built-in module for password hashing

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### File Upload and Processing
- **Multer**: Middleware for handling multipart/form-data file uploads
- **File System**: Node.js built-in module for file operations
- **Path**: Node.js built-in module for file path manipulation

## Recent Changes

### December 2024 - Production Deployment Setup

**Database Migration to Supabase**: Migrated from Replit's built-in database to Supabase PostgreSQL for production hosting:
- Project: greengoldseeds
- Database: PostgreSQL with transaction pooler for connection optimization
- Schema: Successfully pushed to production using Drizzle migrations
- Demo Accounts: Configured with admin and operator demo credentials

**Vercel Deployment Configuration**: Prepared application for Vercel hosting:
- Build Process: Frontend (Vite) + Backend (ESBuild) compilation
- Configuration: vercel.json with proper routing for SPA and API endpoints
- Environment: DATABASE_URL configured for Supabase connection
- File Structure: dist/public/ (frontend) and dist/index.js (backend)

**Demo User Updates**: Updated demo login functionality:
- Admin: username "admin" / password "admin123"  
- Operator: username "op2" / password "test123" (email: op@test.com)
- Product Assignment: All existing products assigned to op@test.com user