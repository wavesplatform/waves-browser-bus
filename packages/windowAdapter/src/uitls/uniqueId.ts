export default (() => {
    const salt = Math.floor(Date.now() * Math.random());
    let counter = 0;
    return (prefix: string) => `${prefix}-${salt}-${counter++}`;
})();