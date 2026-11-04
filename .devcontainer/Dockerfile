FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

RUN apt update && export DEBIAN_FRONTEND=noninteractive \
    && apt install -y --no-install-recommends \
        vim \
        default-mysql-client \
    && apt clean -y && rm -rf /var/lib/apt/lists/*

# Headless Chromium for the Playwright MCP server (.mcp.json). --with-deps installs the system libraries.
# Keep this version equal to the playwright that @playwright/mcp depends on (`pnpm why playwright-core`),
# otherwise the browser revision won't match. Bump both together.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN npx --yes playwright@1.65.0-alpha-2026-10-30 install --with-deps chromium \
    && chmod -R a+rX /opt/playwright \
    && apt clean -y && rm -rf /var/lib/apt/lists/*

RUN echo "Europe/Zurich" > /etc/timezone \
    && ln -snf /usr/share/zoneinfo/Europe/Zurich /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata

RUN git config --global --add safe.directory /workspaces/app

WORKDIR /workspaces/app
