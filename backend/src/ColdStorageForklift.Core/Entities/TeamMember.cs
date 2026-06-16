namespace ColdStorageForklift.Core.Entities;

public class TeamMember
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Badge { get; set; } = string.Empty;
    public MemberType MemberType { get; set; }
    public DateTime JoinedAt { get; set; }
    public Team? Team { get; set; }
}

public enum MemberType
{
    Operator = 0,
    Worker = 1,
    Supervisor = 2
}
