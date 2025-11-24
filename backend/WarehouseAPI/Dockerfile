FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["WarehouseAPI/WarehouseAPI.csproj", "WarehouseAPI/"]
RUN dotnet restore "WarehouseAPI/WarehouseAPI.csproj"

COPY . .
WORKDIR "/src/WarehouseAPI"
RUN dotnet build "WarehouseAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "WarehouseAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "WarehouseAPI.dll"]
