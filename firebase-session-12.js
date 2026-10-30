import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

export function getStudentId(user) {
  const match = (user?.email || "").match(/^(\d{5})@auth\.25withcoding\.kr$/i);
  return match?.[1] || "";
}

export function waitForStudentSession(auth) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      const studentId = getStudentId(user);
      if (!studentId) {
        localStorage.removeItem("userId");
        localStorage.removeItem("firebaseIdToken");
        localStorage.removeItem("firebaseRefreshToken");
        resolve(null);
        return;
      }
      localStorage.setItem("userId", studentId);
      resolve({ user, studentId });
    }, error => {
      unsubscribe();
      reject(error);
    });
  });
}
