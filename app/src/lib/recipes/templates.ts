type NodeTemplateArgs = {
  buildCmd: string;
  startCmd: string;
  port: number;
  hasLockfile: boolean;
};

export function nextjsDockerfile({
  buildCmd,
  startCmd,
  port,
  hasLockfile,
}: NodeTemplateArgs): string {
  const install = hasLockfile ? "npm ci --no-audit --no-fund" : "npm install --no-audit --no-fund";
  return `# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN ${install}
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN ${buildCmd}

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE ${port}
CMD ${jsonArgv(startCmd)}
`;
}

type PyTemplateArgs = {
  startCmd: string;
  port: number;
  hasRequirements: boolean;
};

export function fastapiDockerfile({
  startCmd,
  port,
  hasRequirements,
}: PyTemplateArgs): string {
  const installStep = hasRequirements
    ? "COPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt"
    : "RUN pip install --no-cache-dir fastapi 'uvicorn[standard]'";
  return `# syntax=docker/dockerfile:1.7
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
${installStep}
COPY . .
EXPOSE ${port}
CMD ${jsonArgv(startCmd)}
`;
}

type StaticArgs = { port: number };

export function staticDockerfile({ port }: StaticArgs): string {
  return `# syntax=docker/dockerfile:1.7
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN printf 'server {\\n  listen ${port};\\n  root /usr/share/nginx/html;\\n  index index.html;\\n  location / { try_files $uri $uri/ /index.html; }\\n}\\n' > /etc/nginx/conf.d/default.conf
EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]
`;
}

function jsonArgv(cmd: string): string {
  const parts = cmd.trim().split(/\s+/);
  return JSON.stringify(parts);
}
