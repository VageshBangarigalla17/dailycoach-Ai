import { db } from '../config/firebase';
import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query 
} from 'firebase/firestore';

export const getSchedules = async (userId) => {
  try {
    const q = query(collection(db, `users/${userId}/schedules`));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching schedules: ", error);
    throw error;
  }
};

export const addSchedule = async (userId, scheduleData) => {
  try {
    const newDocRef = doc(collection(db, `users/${userId}/schedules`));
    const payload = { ...scheduleData, id: newDocRef.id, createdAt: new Date().toISOString() };
    await setDoc(newDocRef, payload);
    console.log("Schedule added: ", payload);
    return payload;
  } catch (error) {
    console.error("Error adding schedule: ", error);
    throw error;
  }
};

export const updateSchedule = async (userId, scheduleId, data) => {
  try {
    const docRef = doc(db, `users/${userId}/schedules`, scheduleId);
    await updateDoc(docRef, data);
    console.log(`Schedule ${scheduleId} updated with`, data);
  } catch (error) {
    console.error("Error updating schedule: ", error);
    throw error;
  }
};

export const deleteSchedule = async (userId, scheduleId) => {
  try {
    const docRef = doc(db, `users/${userId}/schedules`, scheduleId);
    await deleteDoc(docRef);
    console.log(`Schedule ${scheduleId} deleted`);
  } catch (error) {
    console.error("Error deleting schedule: ", error);
    throw error;
  }
};

export const toggleSchedule = async (userId, scheduleId, isActive) => {
  return await updateSchedule(userId, scheduleId, { isActive });
};

export const subscribeToSchedules = (userId, callback) => {
  try {
    const q = query(collection(db, `users/${userId}/schedules`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const schedules = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(schedules);
    });
    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to schedules: ", error);
    throw error;
  }
};
