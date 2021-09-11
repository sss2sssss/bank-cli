function getCurrentTime()
{
    return new Date(new Date().getTime()).toISOString();
}

module.exports.getCurrentTime = getCurrentTime;