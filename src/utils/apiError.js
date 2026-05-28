class ApiError extends Error {
    constructor(
        statuscode,
        messages = "Something went wrong",
        error = [],
        statck = ""
        
    ){
        super(message)
        this.statuscode = statuscode
        this.data = null 
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}