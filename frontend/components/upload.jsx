function UploadModule( {onClick} ) {
    return (
        <div className="absolute h-[350px] w-[500px] rounded-md bg-white">
            <button className="" onClick={onClick} >
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#DC143C" class="bi bi-x" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                </svg>
            </button>
        </div>
    );
    }
      
      export default UploadModule;



