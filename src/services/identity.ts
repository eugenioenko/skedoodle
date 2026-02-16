import { ulid } from 'ulid';
import { UserInfo } from './protocol';



function getRandomName() {
    const adjectives = ['Flying', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Black', 'White', 'Gray'];
    const nouns = ['Cat', 'Dog', 'Fox', 'Lion', 'Tiger', 'Bear', 'Wolf', 'Eagle', 'Shark', 'Panda'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

function getRandomColor() {
    return `hsl(${Math.floor(Math.random() * 360)}, 90%, 55%)`;
}

export function getIdentity(): UserInfo {
    const newIdentity: UserInfo = {
        uid: ulid(),
        name: getRandomName(),
        color: getRandomColor(),
    };

    return newIdentity;
}
