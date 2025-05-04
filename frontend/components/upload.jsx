function UploadModule({onClick, handleUpload}) {
    
    return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] rounded-md bg-white shadow-lg z-50">
            <div className="relative w-full">
                <button className="absolute top-2 right-2 z-10" onClick={onClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#DC143C" className="bi bi-x" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                    </svg>
                </button>
            </div>
            <div className="flex flex-col space-y-4 items-center mt-4 w-full h-full"> 
                <h3 className="font-mulish">Upload CSV File or Image</h3>
                <button className="flex align-center justify-center border-2 border-[#3D591C] rounded-md h-10 w-20 bg-[#B5D293] mt-10">

                </button>
            </div>
            

        </div>
    );
}
      
    export default UploadModule;



