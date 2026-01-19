FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

RUN apt update && export DEBIAN_FRONTEND=noninteractive \
    && apt install -y --no-install-recommends \
        vim \
        default-mysql-client \
    && apt clean -y && rm -rf /var/lib/apt/lists/*

RUN echo "Europe/Zurich" > /etc/timezone \
    && ln -snf /usr/share/zoneinfo/Europe/Zurich /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata

RUN git config --global --add safe.directory /workspaces/app

WORKDIR /workspaces/app
