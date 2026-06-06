import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, query, where, getDoc } from 'firebase/firestore';

export const logTaskCompletion = async (userId, taskId, date, status, completedAt, scheduledTime) => {
  try {
    const logRef = doc(db, `users/${userId}/dailyLogs/${date}_${taskId}`);
    const payload = {
      taskId,
      status, // 'done', 'late', 'missed'
      completedAt: completedAt || null,
      scheduledTime,
      dateString: date
    };
    await setDoc(logRef, payload);
    console.log(`Task ${taskId} logged as ${status} for ${date}`);
    return payload;
  } catch (error) {
    console.error("Error logging task completion:", error);
    throw error;
  }
};

export const getTodayLogs = async (userId, date) => {
  try {
    const q = query(
      collection(db, `users/${userId}/dailyLogs`), 
      where("dateString", "==", date)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching today's logs:", error);
    throw error;
  }
};

export const getWeekLogs = async (userId, startDate, endDate) => {
  try {
    // In a real scenario, date strings should be sortable (YYYY-MM-DD)
    const q = query(
      collection(db, `users/${userId}/dailyLogs`),
      where("dateString", ">=", startDate),
      where("dateString", "<=", endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching week logs:", error);
    throw error;
  }
};

export const getStreakCount = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      // In a real app, streak logic might be calculated from dailyLogs
      // or updated iteratively here. We'll simulate fetching a cached count.
      return userDoc.data().streakCount || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching streak count:", error);
    return 0;
  }
};
