#!/bin/bash

# FinePointRehab Test Runner - Task 21 Testing Infrastructure
# This script runs all tests for the application

set -e  # Exit on any error

echo "🚀 FinePointRehab Test Suite - Task 21"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ to continue."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed"
    fi
}

# Check if test server is running
check_test_server() {
    print_status "Checking test server on port 8081..."
    
    if curl -s http://localhost:8081/ > /dev/null 2>&1; then
        print_success "Test server is running on port 8081"
        return 0
    else
        print_warning "Test server is not running on port 8081"
        return 1
    fi
}

# Start test server
start_test_server() {
    print_status "Starting test server..."
    
    # Kill any existing server on port 8081
    if lsof -ti:8081 > /dev/null 2>&1; then
        print_status "Killing existing server on port 8081..."
        kill -9 $(lsof -ti:8081) 2>/dev/null || true
        sleep 2
    fi
    
    # Start server in background
    npm run serve:test > server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    print_status "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8081/ > /dev/null 2>&1; then
            print_success "Test server started (PID: $SERVER_PID)"
            echo $SERVER_PID > .test-server.pid
            return 0
        fi
        sleep 1
    done
    
    print_error "Failed to start test server"
    return 1
}

# Stop test server
stop_test_server() {
    if [ -f .test-server.pid ]; then
        SERVER_PID=$(cat .test-server.pid)
        print_status "Stopping test server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        rm -f .test-server.pid
        print_success "Test server stopped"
    fi
}

# Run Jest unit tests
run_unit_tests() {
    print_status "Running Jest unit tests..."
    echo "----------------------------------------"
    
    if npm run test; then
        print_success "✅ Unit tests passed"
        return 0
    else
        print_error "❌ Unit tests failed"
        return 1
    fi
}

# Run Playwright E2E tests
run_e2e_tests() {
    print_status "Running Playwright E2E tests..."
    echo "----------------------------------------"
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ] && [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
        print_status "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi
    
    if npm run test:e2e; then
        print_success "✅ E2E tests passed"
        return 0
    else
        print_error "❌ E2E tests failed"
        return 1
    fi
}

# Run Lighthouse performance audit
run_lighthouse_audit() {
    print_status "Running Lighthouse performance audit..."
    echo "----------------------------------------"
    
    if npm run test:lighthouse; then
        print_success "✅ Performance audit passed"
        return 0
    else
        print_error "❌ Performance audit failed"
        return 1
    fi
}

# Run test coverage report
run_coverage_report() {
    print_status "Generating test coverage report..."
    echo "----------------------------------------"
    
    if npm run test:coverage; then
        print_success "✅ Coverage report generated"
        
        if [ -d "coverage" ]; then
            print_status "Coverage report available at: coverage/lcov-report/index.html"
        fi
        return 0
    else
        print_error "❌ Coverage report failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    stop_test_server
    
    # Remove temporary files
    rm -f server.log
    
    print_status "Cleanup completed"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local UNIT_TESTS_PASSED=false
    local E2E_TESTS_PASSED=false
    local LIGHTHOUSE_PASSED=false
    local COVERAGE_PASSED=false
    local SERVER_STARTED=false
    
    # Parse command line arguments
    RUN_UNIT=true
    RUN_E2E=true
    RUN_LIGHTHOUSE=true
    RUN_COVERAGE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_E2E=false
                RUN_LIGHTHOUSE=false
                shift
                ;;
            --e2e-only)
                RUN_UNIT=false
                RUN_LIGHTHOUSE=false
                shift
                ;;
            --lighthouse-only)
                RUN_UNIT=false
                RUN_E2E=false
                shift
                ;;
            --with-coverage)
                RUN_COVERAGE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --unit-only       Run only unit tests"
                echo "  --e2e-only        Run only E2E tests"
                echo "  --lighthouse-only Run only Lighthouse audit"
                echo "  --with-coverage   Include coverage report"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Pre-flight checks
    check_node
    install_dependencies
    
    # Create test results directory
    mkdir -p test-results
    
    # Start server if needed for E2E or Lighthouse tests
    if [ "$RUN_E2E" = true ] || [ "$RUN_LIGHTHOUSE" = true ]; then
        if ! check_test_server; then
            if start_test_server; then
                SERVER_STARTED=true
            else
                print_error "Cannot run E2E tests or Lighthouse audit without test server"
                exit 1
            fi
        fi
    fi
    
    # Run tests based on options
    if [ "$RUN_UNIT" = true ]; then
        if run_unit_tests; then
            UNIT_TESTS_PASSED=true
        fi
    fi
    
    if [ "$RUN_E2E" = true ]; then
        if run_e2e_tests; then
            E2E_TESTS_PASSED=true
        fi
    fi
    
    if [ "$RUN_LIGHTHOUSE" = true ]; then
        if run_lighthouse_audit; then
            LIGHTHOUSE_PASSED=true
        fi
    fi
    
    if [ "$RUN_COVERAGE" = true ]; then
        if run_coverage_report; then
            COVERAGE_PASSED=true
        fi
    fi
    
    # Summary
    echo ""
    echo "🏁 TEST SUMMARY"
    echo "==============="
    
    if [ "$RUN_UNIT" = true ]; then
        if [ "$UNIT_TESTS_PASSED" = true ]; then
            echo -e "Unit Tests:        ${GREEN}✅ PASSED${NC}"
        else
            echo -e "Unit Tests:        ${RED}❌ FAILED${NC}"
        fi
    fi
    
    if [ "$RUN_E2E" = true ]; then
        if [ "$E2E_TESTS_PASSED" = true ]; then
            echo -e "E2E Tests:         ${GREEN}✅ PASSED${NC}"
        else
            echo -e "E2E Tests:         ${RED}❌ FAILED${NC}"
        fi
    fi
    
    if [ "$RUN_LIGHTHOUSE" = true ]; then
        if [ "$LIGHTHOUSE_PASSED" = true ]; then
            echo -e "Lighthouse Audit:  ${GREEN}✅ PASSED${NC}"
        else
            echo -e "Lighthouse Audit:  ${RED}❌ FAILED${NC}"
        fi
    fi
    
    if [ "$RUN_COVERAGE" = true ]; then
        if [ "$COVERAGE_PASSED" = true ]; then
            echo -e "Coverage Report:   ${GREEN}✅ GENERATED${NC}"
        else
            echo -e "Coverage Report:   ${RED}❌ FAILED${NC}"
        fi
    fi
    
    # Overall result
    local OVERALL_SUCCESS=true
    
    if [ "$RUN_UNIT" = true ] && [ "$UNIT_TESTS_PASSED" = false ]; then
        OVERALL_SUCCESS=false
    fi
    
    if [ "$RUN_E2E" = true ] && [ "$E2E_TESTS_PASSED" = false ]; then
        OVERALL_SUCCESS=false
    fi
    
    if [ "$RUN_LIGHTHOUSE" = true ] && [ "$LIGHTHOUSE_PASSED" = false ]; then
        OVERALL_SUCCESS=false
    fi
    
    echo ""
    if [ "$OVERALL_SUCCESS" = true ]; then
        echo -e "