// Define a type for our window with shell
export default interface ExtendedWindow extends Window {
  shell?: {
    getTokenDeferred: () => Promise<string>;
  };
  Microsoft?: {
    Dynamic365?: {
      Portal?: {
        User?: {
          userName?: string;
          firstName?: string;
          lastName?: string;
          email?: string;
          userRoles?: string[];
        };
        tenant?: string;
      };
    };
  };
}
