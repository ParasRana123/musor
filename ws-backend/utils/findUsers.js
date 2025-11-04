export default function findUser(users , ws) {
    return users.find((user) => user.ws === ws);
}