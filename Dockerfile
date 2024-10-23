# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0-noble AS backend-build
ARG COMMIT_SHA=unknown
WORKDIR /app/backend
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
COPY --from=frontend-build /app/backend/wwwroot ./wwwroot
RUN dotnet publish -c Release -o out /p:GitCommit=$COMMIT_SHA

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0-noble-chiseled
WORKDIR /app
COPY --from=backend-build /app/backend/out ./
EXPOSE 8080
ENTRYPOINT ["dotnet", "FcmTester.Api.dll"]
