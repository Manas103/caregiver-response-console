interface ResidentInfoProps {
  residentName: string;
  residentRoom: string;
}

/** Resident name and room, the two facts a caregiver needs before walking
 * toward an alert. */
export function ResidentInfo({ residentName, residentRoom }: ResidentInfoProps) {
  return (
    <div className="resident-info">
      <span className="resident-name">{residentName}</span>
      <span className="resident-room">Room {residentRoom}</span>
    </div>
  );
}
