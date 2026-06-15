FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["backend/src/ColdStorageForklift.Api/ColdStorageForklift.Api.csproj", "backend/src/ColdStorageForklift.Api/"]
COPY ["backend/src/ColdStorageForklift.Core/ColdStorageForklift.Core.csproj", "backend/src/ColdStorageForklift.Core/"]
COPY ["backend/src/ColdStorageForklift.Infrastructure/ColdStorageForklift.Infrastructure.csproj", "backend/src/ColdStorageForklift.Infrastructure/"]
COPY ["backend/src/ColdStorageForklift.Services/ColdStorageForklift.Services.csproj", "backend/src/ColdStorageForklift.Services/"]
COPY ["backend/Directory.Build.props", "backend/"]
RUN dotnet restore "backend/src/ColdStorageForklift.Api/ColdStorageForklift.Api.csproj"

COPY backend/ backend/
RUN dotnet publish "backend/src/ColdStorageForklift.Api/ColdStorageForklift.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ColdStorageForklift.Api.dll"]
