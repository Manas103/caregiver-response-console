interface HeaderProps {
  currentUser: string;
}

/** Fixed top bar: console title and the signed-in caregiver's name. There is
 * no login flow in this repo (see README limitations); the user id is a
 * fixed prop set once in App.tsx. */
export function Header({ currentUser }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>Caregiver Response Console</h1>
      <span className="app-header-user">{currentUser}</span>
    </header>
  );
}
