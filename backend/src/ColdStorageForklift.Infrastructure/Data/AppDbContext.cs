using ColdStorageForklift.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<ZoneObstacle> ZoneObstacles => Set<ZoneObstacle>();
    public DbSet<Forklift> Forklifts => Set<Forklift>();
    public DbSet<Personnel> Personnel => Set<Personnel>();
    public DbSet<PositionRecord> PositionRecords => Set<PositionRecord>();
    public DbSet<BlindSpotZone> BlindSpotZones => Set<BlindSpotZone>();
    public DbSet<CollisionWarning> CollisionWarnings => Set<CollisionWarning>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<EventLog> EventLogs => Set<EventLog>();
    public DbSet<PredictionWarning> PredictionWarnings => Set<PredictionWarning>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Zone>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.Width).HasPrecision(18, 2);
            entity.Property(e => e.Height).HasPrecision(18, 2);
            entity.Property(e => e.PositionX).HasPrecision(18, 2);
            entity.Property(e => e.PositionY).HasPrecision(18, 2);
            entity.Property(e => e.Temperature).HasPrecision(5, 2);
            entity.HasMany(e => e.ZoneObstacles)
                .WithOne(o => o.Zone)
                .HasForeignKey(o => o.ZoneId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.BlindSpotZones)
                .WithOne(b => b.Zone)
                .HasForeignKey(b => b.ZoneId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(e => e.CollisionWarnings)
                .WithOne(w => w.Zone)
                .HasForeignKey(w => w.ZoneId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ZoneObstacle>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.PositionX).HasPrecision(18, 2);
            entity.Property(e => e.PositionY).HasPrecision(18, 2);
            entity.Property(e => e.Width).HasPrecision(18, 2);
            entity.Property(e => e.Height).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Forklift>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Model).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.CurrentPositionX).HasPrecision(18, 2);
            entity.Property(e => e.CurrentPositionY).HasPrecision(18, 2);
            entity.Property(e => e.Direction).HasPrecision(18, 2);
            entity.Property(e => e.Speed).HasPrecision(18, 2);
            entity.Property(e => e.BlindSpotRadius).HasPrecision(18, 2);
            entity.HasOne(e => e.Team)
                .WithMany(t => t.Forklifts)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(e => e.BlindSpotZones)
                .WithOne(b => b.Forklift)
                .HasForeignKey(b => b.ForkliftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Personnel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Badge).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.CurrentPositionX).HasPrecision(18, 2);
            entity.Property(e => e.CurrentPositionY).HasPrecision(18, 2);
            entity.HasOne(e => e.Team)
                .WithMany(t => t.Personnel)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PositionRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).HasConversion<int>();
            entity.Property(e => e.PositionX).HasPrecision(18, 2);
            entity.Property(e => e.PositionY).HasPrecision(18, 2);
            entity.Property(e => e.Direction).HasPrecision(18, 2);
            entity.Property(e => e.Speed).HasPrecision(18, 2);
            entity.HasIndex(e => e.EntityId);
            entity.HasIndex(e => e.RecordedAt);
        });

        modelBuilder.Entity<BlindSpotZone>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CenterX).HasPrecision(18, 2);
            entity.Property(e => e.CenterY).HasPrecision(18, 2);
            entity.Property(e => e.Radius).HasPrecision(18, 2);
            entity.Property(e => e.Direction).HasPrecision(18, 2);
            entity.Property(e => e.RiskLevel).HasConversion<int>();
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<CollisionWarning>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WarningType).HasConversion<int>();
            entity.Property(e => e.RiskLevel).HasConversion<int>();
            entity.Property(e => e.Distance).HasPrecision(18, 2);
            entity.Property(e => e.ForkliftPositionX).HasPrecision(18, 2);
            entity.Property(e => e.ForkliftPositionY).HasPrecision(18, 2);
            entity.Property(e => e.PersonnelPositionX).HasPrecision(18, 2);
            entity.Property(e => e.PersonnelPositionY).HasPrecision(18, 2);
            entity.Property(e => e.Message).HasMaxLength(500).IsRequired();
            entity.HasOne(e => e.Forklift)
                .WithMany()
                .HasForeignKey(e => e.ForkliftId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Personnel)
                .WithMany()
                .HasForeignKey(e => e.PersonnelId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.IsAcknowledged);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Shift).HasConversion<int>();
            entity.Property(e => e.Leader).HasMaxLength(100).IsRequired();
            entity.HasMany(e => e.TeamMembers)
                .WithOne(m => m.Team)
                .HasForeignKey(m => m.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MemberName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Badge).HasMaxLength(50).IsRequired();
            entity.Property(e => e.MemberType).HasConversion<int>();
        });

        modelBuilder.Entity<EventLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).HasConversion<int>();
            entity.Property(e => e.Severity).HasConversion<int>();
            entity.Property(e => e.Description).HasMaxLength(1000).IsRequired();
            entity.HasIndex(e => e.OccurredAt);
            entity.HasIndex(e => e.EventType);
        });

        modelBuilder.Entity<PredictionWarning>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WarningType).HasConversion<int>();
            entity.Property(e => e.PredictedRiskLevel).HasConversion<int>();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.PredictedDistance).HasPrecision(18, 2);
            entity.Property(e => e.ForkliftPositionX).HasPrecision(18, 2);
            entity.Property(e => e.ForkliftPositionY).HasPrecision(18, 2);
            entity.Property(e => e.ForkliftSpeed).HasPrecision(18, 2);
            entity.Property(e => e.ForkliftDirection).HasPrecision(18, 2);
            entity.Property(e => e.PersonnelPositionX).HasPrecision(18, 2);
            entity.Property(e => e.PersonnelPositionY).HasPrecision(18, 2);
            entity.Property(e => e.PersonnelSpeed).HasPrecision(18, 2);
            entity.Property(e => e.PersonnelDirection).HasPrecision(18, 2);
            entity.Property(e => e.PredictedCollisionTime).HasPrecision(18, 2);
            entity.Property(e => e.Message).HasMaxLength(500).IsRequired();
            entity.Property(e => e.HandleRemark).HasMaxLength(500);
            entity.HasOne(e => e.Forklift)
                .WithMany()
                .HasForeignKey(e => e.ForkliftId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Personnel)
                .WithMany()
                .HasForeignKey(e => e.PersonnelId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Zone)
                .WithMany()
                .HasForeignKey(e => e.ZoneId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => e.PredictedRiskLevel);
        });

        base.OnModelCreating(modelBuilder);
    }
}
