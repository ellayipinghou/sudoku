from keras.datasets import mnist
(x_train, y_train), (x_test, y_test) = mnist.load_data()

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Conv2D, Flatten, MaxPooling2D, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping

# remove all 0's from training sets
# make mask - true for not 0, false for 0
train_mask = y_train != 0
# note: In numpy, using a boolean array as an index for another array filters only the elements where the mask is True
x_train_filtered = x_train[train_mask]
y_train_filtered = y_train[train_mask]
# move all the categories down by 1, since there's no zero anymore
y_train_filtered = y_train_filtered - 1

# remove all 0's from testing sets
test_mask = y_test != 0
x_test_filtered = x_test[test_mask]
y_test_filtered = y_test[test_mask]
y_test_filtered = y_test_filtered - 1

from tensorflow.keras.utils import to_categorical
y_cat_test = to_categorical(y_test_filtered,9)
y_cat_train = to_categorical(y_train_filtered,9)

# normalize x data
x_train_filtered = x_train_filtered / 255
x_test_filtered = x_test_filtered / 255

# reshape to include channel dimension
x_train_filtered = x_train_filtered.reshape(54077, 28, 28, 1)
x_test_filtered = x_test_filtered.reshape(9020, 28, 28, 1)

###### BUILD MODEL ######
model = Sequential()

# CONVOLUTIONAL LAYER
model.add(Conv2D(filters=32, kernel_size=(4,4),input_shape=(28, 28, 1), activation='relu',))
# POOLING LAYER
model.add(MaxPooling2D(pool_size=(2, 2)))

# FLATTEN IMAGES FROM 28 by 28 to 764 BEFORE FINAL LAYER
model.add(Flatten())

# 128 NEURONS IN DENSE HIDDEN LAYER (YOU CAN CHANGE THIS NUMBER OF NEURONS)
model.add(Dense(128, activation='relu'))

# LAST LAYER IS THE CLASSIFIER, THUS 10 POSSIBLE CLASSES
model.add(Dense(9, activation='softmax'))


model.compile(loss='categorical_crossentropy',
              optimizer=Adam(learning_rate=0.001),
              metrics=['accuracy'])

early_stop = EarlyStopping(monitor='val_loss', patience=3)
model.fit(x_train_filtered, y_cat_train, epochs=10, validation_split=0.2, callbacks=[early_stop])
model.save('new_model.h5')